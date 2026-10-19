import { db } from "@/db";
import { slaCredits, shipments, tariffs, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { writeAudit } from "./auth";
import { ensureWallet, postLedger } from "./ledger";

/**
 * ANBEAN TESLİMAT GÜVENCESİ
 *  1. SLA aşılırsa müşteri talep etmeden kredi açılır.
 *  2. İstisnaya düşen gönderi 5 dakika içinde çözüme bağlanır.
 *  3. Kredi gerçek para hareketidir: gönderiyi oluşturanın cüzdanına çift
 *     taraflı kayıtla işlenir. (Önceki sürüm krediyi yalnızca tabloya yazıyor,
 *     takip sayfası buna rağmen "iade edildi" diyordu.)
 */
export const GUARANTEE = {
  /** İstisna çözüm taahhüdü (dakika). */
  resolutionSlaMinutes: 5,
  /** Gecikme kademeleri: aşım dakikası → iade oranı. */
  tiers: [
    { overMinutes: 120, percent: 100 },
    { overMinutes: 60, percent: 50 },
    { overMinutes: 20, percent: 25 },
  ],
  failedDeliveryPercent: 100,
};

export function creditPercentForDelay(overMinutes: number): number {
  for (const tier of GUARANTEE.tiers) {
    if (overMinutes >= tier.overMinutes) return tier.percent;
  }
  return 0;
}

export function minutesLate(etaAt: Date | null, deliveredAt: Date | null): number {
  if (!etaAt) return 0;
  const end = deliveredAt ? new Date(deliveredAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(etaAt).getTime()) / 60_000));
}

/** Çözüm saati: istisna açıldıysa kalan saniye (negatifse taahhüt aşıldı). */
export function resolutionSecondsLeft(exceptionAt: Date | null, resolvedAt: Date | null): number | null {
  if (!exceptionAt || resolvedAt) return null;
  const deadline = new Date(exceptionAt).getTime() + GUARANTEE.resolutionSlaMinutes * 60_000;
  return Math.round((deadline - Date.now()) / 1000);
}

/**
 * Hak doğduysa müşteri talep etmeden kredi açar, ardından onaylı tüm
 * kredileri cüzdana işler. Aynı sebeple iki kredi açılmaz; aynı kredi iki
 * kez ödenmez (idempotency anahtarı kredi kimliğine bağlı).
 */
export async function evaluateGuarantee(shipmentId: number): Promise<{ issued: boolean; amountKurus: number }> {
  const [shipment] = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  if (!shipment) return { issued: false, amountKurus: 0 };

  const existing = await db.select().from(slaCredits).where(eq(slaCredits.shipmentId, shipmentId));

  let reason: string | null = null;
  let percent = 0;
  if (shipment.status === "teslimat_denemesi_basarisiz") {
    reason = "basarisiz_teslimat";
    percent = GUARANTEE.failedDeliveryPercent;
  } else {
    percent = creditPercentForDelay(minutesLate(shipment.etaAt, shipment.deliveredAt));
    if (percent > 0) reason = "gecikme";
  }

  let issued = false;
  let amountKurus = 0;
  if (reason && percent > 0 && !existing.some((row) => row.reason === reason)) {
    // Kredi, teslimat ücreti (tarife tabanı) üzerinden hesaplanır.
    const [tariff] = await db.select().from(tariffs).where(eq(tariffs.code, shipment.tariffCode)).limit(1);
    const base = tariff?.baseKurus ?? shipment.priceKurus;
    amountKurus = Math.round((base * percent) / 100);

    await db.insert(slaCredits).values({
      shipmentId,
      reason,
      amountKurus,
      ratePercent: percent,
      status: "otomatik_onaylandi",
      note:
        reason === "gecikme"
          ? `Tahmini teslim saati aşıldı: %${percent} teslimat ücreti iadesi otomatik işlendi.`
          : `Teslimat denemesi sonuçsuz kaldı: %${percent} teslimat ücreti iadesi otomatik işlendi.`,
    });

    await writeAudit({
      actorRole: "sistem",
      action: "guvence_kredisi_acildi",
      entity: "shipment",
      entityId: String(shipmentId),
      meta: { reason, percent, amountKurus },
    });
    issued = true;
  }

  await settleCredits(shipment.id, shipment.createdByUserId);
  return { issued, amountKurus };
}

/** Onaylı ama henüz ödenmemiş kredileri gönderiyi oluşturanın cüzdanına işler. */
export async function settleCredits(shipmentId: number, payerUserId: number | null): Promise<void> {
  if (!payerUserId) return;
  const rows = await db.select().from(slaCredits).where(eq(slaCredits.shipmentId, shipmentId));
  const pending = rows.filter((row) => row.status === "otomatik_onaylandi");
  if (pending.length === 0) return;

  const [systemWallet] = await db.select().from(wallets).where(eq(wallets.ownerKind, "system")).limit(1);
  if (!systemWallet) return;
  const payerWallet = await ensureWallet("user", payerUserId);

  for (const credit of pending) {
    try {
      await postLedger({
        kind: "guarantee_refund",
        idempotencyKey: `guarantee_credit_${credit.id}`,
        refKind: "shipment",
        refId: shipmentId,
        note: credit.note,
        postings: [
          { walletId: systemWallet.id, side: "debit", amountKurus: credit.amountKurus, reason: "guvence_iadesi" },
          { walletId: payerWallet.id, side: "credit", amountKurus: credit.amountKurus, reason: "guvence_iadesi" },
        ],
      });
      await db.update(slaCredits).set({ status: "odendi" }).where(eq(slaCredits.id, credit.id));
    } catch {
      // Sistem bakiyesi yetmezse kredi onaylı kalır, sonraki değerlendirmede yeniden denenir.
    }
  }
}

export async function creditsForShipment(shipmentId: number) {
  return db.select().from(slaCredits).where(eq(slaCredits.shipmentId, shipmentId));
}

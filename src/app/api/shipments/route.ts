import { db } from "@/db";
import { shipments, wallets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission, writeAudit } from "@/lib/auth";
import { calculateQuote, formatTry } from "@/lib/pricing";
import { createShipment } from "@/lib/shipments";
import { ensureWallet, postLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 240) : fallback;
}

export async function POST(req: Request) {
  const user = await requirePermission("shipment:create");
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const required = ["recipientName", "recipientPhone", "pickupAddress", "dropAddress"];
  for (const field of required) {
    if (!str(body[field])) return Response.json({ error: `${field} zorunlu` }, { status: 400 });
  }

  // İstemciden gelen tutar yok sayılır: fiyat yalnızca sunucuda hesaplanır.
  const quote = await calculateQuote({
    tariffCode: str(body.tariffCode, "sehir_ici"),
    distanceKm: Number(body.distanceKm ?? 8),
    weightGrams: Number(body.weightGrams ?? 1000),
    dropDistrict: str(body.dropDistrict, "Kadıköy"),
  });

  // Tek cüzdan: gönderi ücreti, sürüşle aynı bakiyeden düşer. Kurumsal hesap faturayı seçebilir.
  const paymentMethod = body.paymentMethod === "fatura" ? "fatura" : "cuzdan";
  const payerWallet = paymentMethod === "cuzdan" ? await ensureWallet("user", user.id) : null;
  if (payerWallet && payerWallet.balanceKurus < quote.totalKurus) {
    return Response.json(
      {
        error: `Cüzdan bakiyesi yetersiz: ${formatTry(payerWallet.balanceKurus)} mevcut, ${formatTry(quote.totalKurus)} gerekli. Bakiye yükle ya da kurumsal faturayı seç.`,
      },
      { status: 402 },
    );
  }

  const { shipment, token } = await createShipment({
    orgId: user.orgId,
    createdByUserId: user.id,
    tariffCode: quote.tariffCode,
    senderName: str(body.senderName, user.fullName),
    senderPhone: str(body.senderPhone, "05000000000"),
    pickupCity: str(body.pickupCity, "İstanbul"),
    pickupDistrict: str(body.pickupDistrict, "Kadıköy"),
    pickupAddress: str(body.pickupAddress),
    recipientName: str(body.recipientName),
    recipientPhone: str(body.recipientPhone),
    dropCity: str(body.dropCity, "İstanbul"),
    dropDistrict: str(body.dropDistrict, "Kadıköy"),
    dropAddress: str(body.dropAddress),
    weightGrams: Math.min(Math.max(Number(body.weightGrams ?? 1000), 100), 50000),
    distanceKm: Math.min(Math.max(Number(body.distanceKm ?? 8), 1), 120),
    priceKurus: quote.totalKurus,
    notes: str(body.notes),
    status: "kurye_atamasi_bekliyor",
    etaMinutes: quote.slaMinutes,
  });

  let paid = false;
  if (payerWallet) {
    const [systemWallet] = await db.select().from(wallets).where(eq(wallets.ownerKind, "system")).limit(1);
    if (systemWallet) {
      try {
        await postLedger({
          kind: "shipment_charge",
          idempotencyKey: `shipment_${shipment.id}_charge`,
          refKind: "shipment",
          refId: shipment.id,
          note: `${shipment.code} · ${quote.tariffName}`,
          postings: [
            { walletId: payerWallet.id, side: "debit", amountKurus: quote.totalKurus, reason: "gonderi_ucreti" },
            { walletId: systemWallet.id, side: "credit", amountKurus: quote.totalKurus, reason: "gonderi_geliri" },
          ],
        });
        await db.update(shipments).set({ financialStatus: "odendi" }).where(eq(shipments.id, shipment.id));
        paid = true;
      } catch {
        // Eşzamanlı harcama bakiyeyi düşürdüyse gönderi "fatura bekliyor"da kalır; hiçbir kayıt silinmez.
      }
    }
  }

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "gonderi_olusturuldu",
    entity: "shipment",
    entityId: String(shipment.id),
    meta: { priceKurus: quote.totalKurus, tariff: quote.tariffCode, paymentMethod, paid },
  });

  return Response.json({ ok: true, code: shipment.code, token, priceKurus: quote.totalKurus, paid });
}

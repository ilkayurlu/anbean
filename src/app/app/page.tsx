import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { shipments, trackingTokens, courierRatings, slaCredits, couriers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import RatingForm from "@/components/RatingForm";
import { formatTry as money } from "@/lib/pricing";
import { evaluateGuarantee, minutesLate } from "@/lib/guarantee";
import { requireRole } from "@/lib/auth";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import StatusStrip, { StatusPill } from "@/components/StatusStrip";
import { formatTry } from "@/lib/pricing";
import { STATUS_COLOR, statusDef } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gönderilerim — Anbean" };

const NAV = [
  { href: "/app", label: "Gönderilerim" },
  { href: "/app/yeni", label: "Yeni gönderi" },
  { href: "/app/siparislerim", label: "Siparişlerim" },
  { href: "/app/suruslerim", label: "Sürüşlerim" },
  { href: "/app/cuzdan", label: "Bakiye" },
  { href: "/fiyat-al", label: "Fiyat hesapla" },
];

export default async function CustomerPortal() {
  const user = await requireRole(["musteri", "admin"]);
  if (!user) redirect("/giris");

  // Tenant filtresi sunucu tarafında zorunlu. Kurumu olmayan kullanıcı
  // YALNIZCA kendi oluşturduğu gönderileri görür — "tümünü listele" yedeği yok.
  const rows = await db
    .select()
    .from(shipments)
    .where(user.orgId ? eq(shipments.orgId, user.orgId) : eq(shipments.createdByUserId, user.id))
    .orderBy(desc(shipments.createdAt));

  const tokens = await db.select().from(trackingTokens);
  const tokenByShipment = new Map(tokens.map((t) => [t.shipmentId, t.token]));

  // Güvence değerlendirmesi: yalnızca aday satırlar (gecikmiş veya istisna).
  for (const row of rows) {
    const isException = statusDef(row.status).kind === "risk";
    const isLate = row.etaAt !== null && minutesLate(row.etaAt, row.deliveredAt) >= 20;
    if (isException || isLate) await evaluateGuarantee(row.id);
  }

  const [ratingRows, creditRows, courierRows] = await Promise.all([
    db.select().from(courierRatings),
    db.select().from(slaCredits),
    db.select().from(couriers),
  ]);
  const ratedShipments = new Set(ratingRows.map((r) => r.shipmentId));
  const courierById = new Map(courierRows.map((c) => [c.id, c]));
  const creditsByShipment = new Map<number, number>();
  for (const credit of creditRows) {
    creditsByShipment.set(
      credit.shipmentId,
      (creditsByShipment.get(credit.shipmentId) ?? 0) + credit.amountKurus,
    );
  }

  const active = rows.filter((r) => !["teslim_edildi", "iptal", "arsivlendi", "iade_edildi"].includes(r.status));
  const delivered = rows.filter((r) => r.status === "teslim_edildi");
  const risky = rows.filter((r) => statusDef(r.status).kind === "risk");

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Gönderilerim"
      subtitle="Her satır bir Durum Renk Şeridi'dir; tablo okumadan durumu görürsün."
      nav={NAV}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Aktif gönderi" value={String(active.length)} tone={STATUS_COLOR.transit} />
        <Metric label="Teslim edildi" value={String(delivered.length)} tone={STATUS_COLOR.delivered} />
        <Metric label="İstisna" value={String(risky.length)} tone={STATUS_COLOR.risk} />
        <Metric
          label="Toplam tutar"
          value={formatTry(rows.reduce((sum, r) => sum + r.priceKurus, 0))}
        />
      </div>

      <div className="mt-6">
        <Card
          title="Şerit listesi"
          action={
            <Link
              href="/app/yeni"
              className="rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-[#0B1220] transition hover:bg-accent-soft"
            >
              + Yeni gönderi
            </Link>
          }
        >
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Henüz gönderi yok. İlk gönderini oluştur.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => {
                const token = tokenByShipment.get(row.id);
                return (
                  <li key={row.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-bold text-[#0B1220]">{row.code}</p>
                        <p className="text-xs text-slate-500">
                          {row.pickupDistrict} → {row.dropDistrict} · {(row.weightGrams / 1000).toFixed(1)} kg ·{" "}
                          {formatTry(row.priceKurus)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill status={row.status} />
                        {token ? (
                          <Link
                            href={`/takip/${token}`}
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-400"
                          >
                            Takip
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <StatusStrip status={row.status} size="sm" className="mt-3" />

                    {creditsByShipment.has(row.id) ? (
                      <p className="mt-3 inline-block rounded-md bg-st-return/10 px-2.5 py-1 text-xs font-semibold text-st-return">
                        Güvence kredisi: {money(creditsByShipment.get(row.id) ?? 0)} otomatik iade edildi
                      </p>
                    ) : null}

                    {row.status === "teslim_edildi" && row.assignedCourierId ? (
                      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                        <RatingForm
                          shipmentId={row.id}
                          courierName={
                            courierById.get(row.assignedCourierId)?.fullName.split(" ")[0] ?? "Kurye"
                          }
                          alreadyRated={ratedShipments.has(row.id)}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </PanelShell>
  );
}

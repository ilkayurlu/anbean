import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { iotVehicles, rides } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import { STATE_COPY } from "@/lib/content";
import { formatTry } from "@/lib/pricing";
import { STATUS_COLOR } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sürüşlerim — Anbean" };

const NAV = [
  { href: "/app", label: "Gönderilerim" },
  { href: "/app/siparislerim", label: "Siparişlerim" },
  { href: "/app/suruslerim", label: "Sürüşlerim" },
  { href: "/app/cuzdan", label: "Bakiye" },
  { href: "/app/destek", label: "Destek" },
];

export default async function SuruslerimPage() {
  const user = await requirePermission("ride:read");
  if (!user) redirect("/giris");

  const rows = await db.select().from(rides).where(eq(rides.riderId, user.id)).orderBy(desc(rides.startedAt));
  const vehicles = await db.select().from(iotVehicles);
  const vehicleById = new Map(vehicles.map((v) => [v.id, v]));

  const totalKurus = rows.reduce((sum, row) => sum + row.priceKurus, 0);
  const totalMinutes = Math.round(rows.reduce((sum, row) => sum + row.durationSeconds, 0) / 60);
  const totalKm = rows.reduce((sum, row) => sum + row.distanceKm, 0);
  const active = rows.find((row) => row.status === "aktif");

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Sürüşlerim"
      subtitle="Elektrikli filo kiralama geçmişi. Sürücülü yolculuk hizmeti kapsamımızda değil."
      nav={NAV}
    >
      {active ? (
        <div className="mb-5 rounded-lg border border-accent/40 bg-accent/8 p-5">
          <p className="text-sm font-semibold text-[#0B1220]">Devam eden sürüş: {active.code}</p>
          <p className="mt-1 text-sm text-slate-700">
            Aracı kilitlemek ve ücreti kesinleştirmek için filo haritasındaki sürüş panelini kullan.
          </p>
          <Link href="/filo-haritasi" className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-xs font-semibold text-[#0B1220]">
            Sürüşü bitir
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Sürüş" value={String(rows.length)} />
        <Metric label="Toplam süre" value={`${totalMinutes} dk`} />
        <Metric label="Toplam mesafe" value={`${totalKm.toFixed(1)} km`} tone={STATUS_COLOR.transit} />
        <Metric label="Toplam tutar" value={formatTry(totalKurus)} />
      </div>

      <div className="mt-6">
        <Card
          title="Geçmiş"
          action={
            <Link href="/filo-haritasi" className="rounded-md border border-slate-300 px-3.5 py-2 text-xs text-slate-700">
              Araç bul
            </Link>
          }
        >
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-700">{STATE_COPY.emptyRides.title}</p>
              <p className="mt-1 text-sm text-slate-500">{STATE_COPY.emptyRides.body}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {rows.map((ride) => (
                <li key={ride.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-800">
                      {ride.code} · {vehicleById.get(ride.vehicleId)?.code ?? "araç"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(ride.startedAt).toLocaleString("tr-TR")} ·{" "}
                      {Math.max(1, Math.round(ride.durationSeconds / 60))} dk · {ride.distanceKm.toFixed(1)} km
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-bold tabular-nums">{formatTry(ride.priceKurus)}</span>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        color: ride.status === "tamamlandi" ? STATUS_COLOR.delivered : STATUS_COLOR.waiting,
                        backgroundColor: `${ride.status === "tamamlandi" ? STATUS_COLOR.delivered : STATUS_COLOR.waiting}1f`,
                      }}
                    >
                      {ride.status === "tamamlandi" ? "Tamamlandı" : ride.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PanelShell>
  );
}

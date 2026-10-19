import { redirect } from "next/navigation";
import { db } from "@/db";
import { shipments, couriers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import StatusStrip, { StatusPill } from "@/components/StatusStrip";
import AssignControl from "@/components/AssignControl";
import ResolutionControl from "@/components/ResolutionControl";
import { STATUS_COLOR, statusDef } from "@/lib/status";
import { GUARANTEE } from "@/lib/guarantee";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dispatch — Anbean Ops" };

export default async function OpsPanel() {
  const user = await requireRole(["ops", "admin"]);
  if (!user) redirect("/giris");

  const rows = await db.select().from(shipments).orderBy(desc(shipments.updatedAt)).limit(100);
  const courierRows = await db.select().from(couriers);
  const activeCouriers = courierRows
    .filter((c) => c.status === "aktif")
    .map((c) => ({ id: c.id, fullName: c.fullName, activeLoad: c.activeLoad, vehicle: c.vehicle }));

  const queue = rows.filter((r) => r.status === "kurye_atamasi_bekliyor" || r.status === "alim_planlandi");
  const exceptions = rows.filter((r) => statusDef(r.status).kind === "risk" || statusDef(r.status).kind === "return");
  const inTransit = rows.filter((r) => ["gonderi_alindi", "aktarma_merkezinde", "dagitima_cikti"].includes(r.status));

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Dispatch"
      subtitle="Canlı saha görünümü ve istisna kuyruğu yan yana."
      nav={[
        { href: "/ops", label: "Dispatch" },
        { href: "/ops/uyarilar", label: "Uyarılar" },
        { href: "/admin/destek", label: "Destek" },
        { href: "/app/yeni", label: "Gönderi oluştur" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Atama kuyruğu" value={String(queue.length)} tone={STATUS_COLOR.waiting} />
        <Metric label="Yolda" value={String(inTransit.length)} tone={STATUS_COLOR.transit} />
        <Metric label="İstisna" value={String(exceptions.length)} tone={STATUS_COLOR.risk} />
        <Metric label="Aktif kurye" value={String(activeCouriers.length)} tone={STATUS_COLOR.delivered} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <Card title="Canlı saha">
            <div className="relative overflow-hidden rounded-md border border-slate-200 bg-[#0b1220]">
              <svg viewBox="0 0 640 300" className="h-64 w-full">
                <defs>
                  <pattern id="opsgrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="640" height="300" fill="url(#opsgrid)" />
                {courierRows.map((courier, index) => {
                  const cx = 70 + ((courier.lastLng ?? 29) - 28.8) * 900;
                  const cy = 240 - ((courier.lastLat ?? 41) - 40.95) * 900;
                  const color = courier.status === "aktif" ? STATUS_COLOR.transit : STATUS_COLOR.waiting;
                  return (
                    <g key={courier.id}>
                      <circle cx={Math.min(Math.max(cx, 40), 600)} cy={Math.min(Math.max(cy, 40), 260)} r="18" fill={color} opacity="0.15" />
                      <circle cx={Math.min(Math.max(cx, 40), 600)} cy={Math.min(Math.max(cy, 40), 260)} r="7" fill={color} />
                      <text
                        x={Math.min(Math.max(cx, 40), 600)}
                        y={Math.min(Math.max(cy, 40), 260) + 26}
                        fontSize="11"
                        fill="#94a3b8"
                        textAnchor="middle"
                      >
                        {courier.fullName.split(" ")[0]} ({courier.activeLoad})
                      </text>
                      <title>{`${courier.fullName} · ${courier.status} · yük ${index}`}</title>
                    </g>
                  );
                })}
              </svg>
            </div>
          </Card>

          <Card title="Atama kuyruğu">
            {queue.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Kuyrukta bekleyen gönderi yok.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {queue.map((row) => (
                  <li key={row.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-bold text-[#0B1220]">{row.code}</p>
                        <p className="text-xs text-slate-500">
                          {row.pickupDistrict} → {row.dropDistrict} · {row.tariffCode}
                        </p>
                      </div>
                      <AssignControl shipmentId={row.id} couriers={activeCouriers} />
                    </div>
                    <StatusStrip status={row.status} size="sm" className="mt-3" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title={`Çözüm merkezi · ${GUARANTEE.resolutionSlaMinutes} dk taahhüt`}>
            {exceptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">İstisna yok. Şerit temiz.</p>
            ) : (
              <ul className="space-y-4">
                {exceptions.map((row) => (
                  <li key={row.id} className="rounded-md border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-sm font-bold text-[#0B1220]">{row.code}</p>
                      <StatusPill status={row.status} />
                    </div>
                    <StatusStrip status={row.status} size="sm" className="mt-3" />
                    <p className="mt-3 text-xs text-slate-500">
                      {row.pickupDistrict} → {row.dropDistrict}
                    </p>
                    <ResolutionControl
                      shipmentId={row.id}
                      deadlineIso={
                        row.exceptionAt
                          ? new Date(
                              new Date(row.exceptionAt).getTime() + GUARANTEE.resolutionSlaMinutes * 60_000,
                            ).toISOString()
                          : null
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Kurye durumu">
            <ul className="divide-y divide-slate-100 text-sm">
              {courierRows.map((courier) => (
                <li key={courier.id} className="flex items-center justify-between py-3">
                  <span className="text-slate-700">
                    {courier.fullName}
                    <span className="ml-2 text-xs text-slate-500">{courier.vehicle}</span>
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      color: courier.status === "aktif" ? STATUS_COLOR.delivered : STATUS_COLOR.waiting,
                      backgroundColor: `${courier.status === "aktif" ? STATUS_COLOR.delivered : STATUS_COLOR.waiting}1f`,
                    }}
                  >
                    {courier.status} · {courier.activeLoad}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </PanelShell>
  );
}

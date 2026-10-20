import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  wallets,
  ledgerEntries,
  iotVehicles,
  fieldTasks,
  geoFences,
  shipments,
  users,
  auditLog,
  couriers,
  tariffs,
  slaCredits,
  notifications,
  mediaSlots,
  courierApplications,
} from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import { StatusPill } from "@/components/StatusStrip";
import { STATUS_COLOR, statusDef } from "@/lib/status";
import { formatTry } from "@/lib/pricing";
import { verifyLedgerBalance } from "@/lib/ledger";

export const dynamic = "force-dynamic";
export const metadata = { title: "Yönetim — Anbean" };

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminPanel() {
  const user = await requireRole(["admin"]);
  if (!user) redirect("/giris");

  const [
    shipmentRows,
    courierRows,
    userRows,
    logRows,
    tariffRows,
    vehicleRows,
    fenceRows,
    fieldTaskRows,
    ledgerRows,
    walletRows,
    creditRows,
    notificationRows,
  ] = await Promise.all([
    db.select().from(shipments).orderBy(desc(shipments.createdAt)).limit(50),
    db.select().from(couriers),
    db.select().from(users),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(25),
    db.select().from(tariffs),
    db.select().from(iotVehicles),
    db.select().from(geoFences),
    db.select().from(fieldTasks).orderBy(desc(fieldTasks.createdAt)).limit(10),
    db.select().from(ledgerEntries).orderBy(desc(ledgerEntries.createdAt)).limit(25),
    db.select().from(wallets),
    db.select().from(slaCredits).orderBy(desc(slaCredits.createdAt)).limit(10),
    db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(10),
  ]);

  const revenue = shipmentRows.reduce((sum, row) => sum + row.priceKurus, 0);
  const deliveredCount = shipmentRows.filter((r) => r.status === "teslim_edildi").length;
  const onTimeRate = shipmentRows.length ? Math.round((deliveredCount / shipmentRows.length) * 100) : 0;

  // Ledger denge kontrolü — son 10 tx'i doğrula.
  const uniqueTx = Array.from(new Set(ledgerRows.map((r) => r.txId))).slice(0, 10);
  const balanceChecks = await Promise.all(uniqueTx.map((txId) => verifyLedgerBalance(txId)));
  const allBalanced = balanceChecks.every((b) => b.ok);

  const totalDebit = ledgerRows.filter((r) => r.side === "debit").reduce((s, r) => s + r.amountKurus, 0);
  const totalCredit = ledgerRows.filter((r) => r.side === "credit").reduce((s, r) => s + r.amountKurus, 0);
  const slotRows = await db.select().from(mediaSlots);
  const applicationRows = await db
    .select()
    .from(courierApplications)
    .orderBy(desc(courierApplications.createdAt))
    .limit(10);

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Yönetim"
      subtitle="Süper-app: kurye + filo + cüzdan tek panelden yönetilir."
      nav={[
        { href: "/admin", label: "Genel" },
        { href: "/admin/finans", label: "Finans" },
        { href: "/admin/destek", label: "Destek" },
        { href: "/admin/basvurular/restoranlar", label: "Restoran başvuruları" },
        { href: "/admin/basvurular/filolar", label: "Filo başvuruları" },
        { href: "/ops", label: "Dispatch" },
        { href: "/ops/uyarilar", label: "Uyarılar" },
        { href: "/filo-haritasi", label: "Filo" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Gönderi" value={String(shipmentRows.length)} />
        <Metric label="Teslim oranı" value={`%${onTimeRate}`} tone={STATUS_COLOR.delivered} />
        <Metric label="Ciro" value={formatTry(revenue)} tone="var(--gonder)" />
        <Metric
          label="Filo"
          value={`${vehicleRows.filter((v) => v.status === "available").length}/${vehicleRows.length} hazır`}
          tone="var(--sur)"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Çift taraflı ledger */}
        <Card
          title="Çift taraflı ledger · append-only"
          action={
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                color: allBalanced ? STATUS_COLOR.delivered : STATUS_COLOR.risk,
                backgroundColor: `${allBalanced ? STATUS_COLOR.delivered : STATUS_COLOR.risk}1f`,
              }}
            >
              {allBalanced ? "Tüm tx dengeli" : "Dengesiz tx var!"}
            </span>
          }
        >
          <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Toplam debit</p>
              <p className="font-display text-base font-bold text-slate-800">{formatTry(totalDebit)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Toplam credit</p>
              <p className="font-display text-base font-bold text-slate-800">{formatTry(totalCredit)}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Cüzdan sayısı</p>
              <p className="font-display text-base font-bold text-slate-800">{walletRows.length}</p>
            </div>
          </div>
          <ul className="max-h-80 overflow-auto divide-y divide-slate-100 text-sm">
            {ledgerRows.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-slate-800">{e.reason}</p>
                  <p className="text-xs text-slate-500">
                    {e.kind} · tx: {e.txId.slice(0, 14)}… · {formatDate(e.createdAt)}
                  </p>
                </div>
                <span
                  className="font-display text-sm font-bold tabular-nums"
                  style={{ color: e.side === "credit" ? STATUS_COLOR.delivered : STATUS_COLOR.risk }}
                >
                  {e.side === "credit" ? "+" : "-"}
                  {formatTry(e.amountKurus)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Filo yönetimi */}
        <Card title={`Filo · ${vehicleRows.length} araç`}>
          <ul className="divide-y divide-slate-100 text-sm">
            {vehicleRows.map((v) => {
              const color =
                v.status === "in_use"
                  ? STATUS_COLOR.transit
                  : v.batteryPercent < 30
                    ? STATUS_COLOR.waiting
                    : v.status === "maintenance"
                      ? STATUS_COLOR.risk
                      : STATUS_COLOR.delivered;
              return (
                <li key={v.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <div>
                      <p className="font-medium text-slate-800">
                        {v.code} · {v.kind}
                      </p>
                      <p className="text-xs text-slate-500">
                        {v.district} · batarya %{v.batteryPercent} · {v.status}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">₺{(v.perMinuteKurus / 100).toFixed(2)}/dk</span>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Geo-fence */}
        <Card title={`Aktif geo-fence · ${fenceRows.length}`}>
          <ul className="divide-y divide-slate-100 text-sm">
            {fenceRows.map((fence) => (
              <li key={fence.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-slate-800">{fence.name}</p>
                  <p className="text-xs text-slate-500">
                    {fence.kind} · {fence.city}
                  </p>
                </div>
                {fence.surgeMultiplier && fence.surgeMultiplier > 1 ? (
                  <span className="rounded-full bg-st-waiting/15 px-2.5 py-0.5 text-[11px] font-semibold text-st-waiting">
                    surge {fence.surgeMultiplier}x
                  </span>
                ) : fence.speedKph ? (
                  <span className="text-xs text-slate-500">{fence.speedKph} km/s</span>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </li>
            ))}
            {fenceRows.length === 0 ? (
              <li className="py-4 text-sm text-slate-500">Aktif bölge yok.</li>
            ) : null}
          </ul>
        </Card>

        {/* Saha görevleri */}
        <Card title={`Saha görevleri · ${fieldTaskRows.length}`}>
          <ul className="divide-y divide-slate-100 text-sm">
            {fieldTaskRows.map((task) => (
              <li key={task.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-slate-800">
                    {task.code} · {task.kind.replace("_", " ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {task.district} · {task.priority} · {task.status}
                  </p>
                </div>
                <span className="font-display text-sm font-bold" style={{ color: STATUS_COLOR.delivered }}>
                  +{formatTry(task.rewardKurus)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title={`Medya slotları · ${slotRows.length}`}>
          <ul className="divide-y divide-slate-100 text-sm">
            {slotRows.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium text-slate-800">{slot.slotKey}</p>
                  <p className="text-xs text-slate-500">
                    {slot.kind} · {slot.providerId ? `Pexels #${slot.providerId}` : "yedek gradyan"}
                    {slot.posterUrl ? " · poster var" : ""}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    color: slot.url ? STATUS_COLOR.delivered : STATUS_COLOR.waiting,
                    backgroundColor: `${slot.url ? STATUS_COLOR.delivered : STATUS_COLOR.waiting}1f`,
                  }}
                >
                  {slot.url ? "kilitli" : "yedek"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Kurye başvuruları">
          {applicationRows.length === 0 ? (
            <p className="py-5 text-sm text-slate-500">Yeni başvuru yok.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {applicationRows.map((application) => (
                <li key={application.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-slate-800">{application.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {application.city} · {application.vehicle}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
                    {application.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Tarife yönetimi">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.1em] text-slate-500">
              <tr>
                <th className="pb-2">Kod</th>
                <th className="pb-2">Taban</th>
                <th className="pb-2">/km</th>
                <th className="pb-2">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tariffRows.map((tariff) => (
                <tr key={tariff.id}>
                  <td className="py-2.5 font-medium">{tariff.name}</td>
                  <td className="py-2.5">{formatTry(tariff.baseKurus)}</td>
                  <td className="py-2.5">{formatTry(tariff.perKmKurus)}</td>
                  <td className="py-2.5">{Math.round(tariff.slaMinutes / 60)} sa</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="Güvence kredileri">
          {creditRows.length === 0 ? (
            <p className="py-5 text-sm text-slate-500">Güvence kredisi açılmadı.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {creditRows.map((credit) => (
                <li key={credit.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-slate-800">
                      #{credit.shipmentId} · {credit.reason}
                    </p>
                    <p className="text-xs text-slate-500">%{credit.ratePercent}</p>
                  </div>
                  <span className="font-display text-sm font-bold" style={{ color: STATUS_COLOR.return }}>
                    {formatTry(credit.amountKurus)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Denetim kaydı (append-only)">
          <ul className="max-h-80 overflow-auto divide-y divide-slate-100 text-sm">
            {logRows.map((log) => (
              <li key={log.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{log.action}</span>
                  <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  {log.actorRole} · {log.entity}
                  {log.entityId ? `#${log.entityId}` : ""}
                </p>
              </li>
            ))}
            {logRows.length === 0 ? <li className="py-4 text-sm text-slate-500">Kayıt yok.</li> : null}
          </ul>
        </Card>

        <Card title="Son gönderiler">
          <ul className="divide-y divide-slate-100 text-sm">
            {shipmentRows.slice(0, 8).map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-medium text-slate-800">{row.code}</p>
                  <p className="text-xs text-slate-500">
                    {row.pickupDistrict} → {row.dropDistrict} · {statusDef(row.status).label}
                  </p>
                </div>
                <StatusPill status={row.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Bildirim kuyruğu (PII maskeli)">
          <ul className="divide-y divide-slate-100 text-sm">
            {notificationRows.map((notification) => (
              <li key={notification.id} className="flex items-center justify-between py-2.5">
                <span className="text-slate-700">{notification.template}</span>
                <span className="text-xs text-slate-500">
                  {notification.channel} · {notification.maskedTarget}
                </span>
              </li>
            ))}
            {notificationRows.length === 0 ? (
              <li className="py-4 text-sm text-slate-500">Bildirim yok.</li>
            ) : null}
          </ul>
        </Card>
      </div>
    </PanelShell>
  );
}

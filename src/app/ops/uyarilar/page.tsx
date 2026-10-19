import { redirect } from "next/navigation";
import { and, isNotNull, lt, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { couriers, fieldTasks, iotVehicles, shipments } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { GUARANTEE } from "@/lib/guarantee";
import { STATUS_COLOR, statusDef } from "@/lib/status";
import { minutesAgo, nowDate, nowMillis } from "@/lib/clock";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import { StatusPill } from "@/components/StatusStrip";

export const dynamic = "force-dynamic";
export const metadata = { title: "Uyarılar — Anbean Ops" };

const TERMINAL = ["teslim_edildi", "iade_edildi", "iptal", "arsivlendi"];

type Alert = {
  level: "kritik" | "uyari" | "bilgi";
  title: string;
  detail: string;
  meta: string;
};

export default async function UyarilarPage() {
  const user = await requirePermission("report:read");
  if (!user) redirect("/giris");

  const now = nowDate();
  const [lateShipments, unassigned, exceptions, lowBattery, openTasks, staleCouriers] = await Promise.all([
    db
      .select()
      .from(shipments)
      .where(and(lt(shipments.etaAt, now), notInArray(shipments.status, TERMINAL)))
      .limit(50),
    db
      .select()
      .from(shipments)
      .where(
        and(
          lt(shipments.createdAt, new Date(nowMillis() - 30 * 60_000)),
          notInArray(shipments.status, [...TERMINAL, "kurye_atandi", "alima_gidiyor", "gonderi_alindi", "aktarma_merkezinde", "dagitima_cikti"]),
        ),
      )
      .limit(50),
    db
      .select()
      .from(shipments)
      .where(and(isNotNull(shipments.exceptionAt), lt(shipments.exceptionAt, new Date(nowMillis() - GUARANTEE.resolutionSlaMinutes * 60_000))))
      .limit(50),
    db.select().from(iotVehicles).where(lt(iotVehicles.batteryPercent, 20)).limit(50),
    db
      .select()
      .from(fieldTasks)
      .where(and(lt(fieldTasks.createdAt, new Date(nowMillis() - 15 * 60_000)), notInArray(fieldTasks.status, ["tamamlandi", "iptal"])))
      .limit(50),
    db
      .select()
      .from(couriers)
      .where(and(lt(couriers.lastSeenAt, new Date(nowMillis() - 30 * 60_000)), isNotNull(couriers.lastSeenAt)))
      .limit(50),
  ]);

  const alerts: Alert[] = [];

  for (const s of exceptions.filter((e) => !TERMINAL.includes(e.status))) {
    alerts.push({
      level: "kritik",
      title: `${s.code} · çözüm taahhüdü aşıldı`,
      detail: `İstisna ${minutesAgo(s.exceptionAt)} dk önce açıldı, taahhüt ${GUARANTEE.resolutionSlaMinutes} dk. Durum: ${statusDef(s.status).label}.`,
      meta: "Çözüm Merkezi'nde karar bekliyor",
    });
  }
  for (const s of lateShipments) {
    alerts.push({
      level: "kritik",
      title: `${s.code} · SLA aşıldı`,
      detail: `Tahmini teslim ${minutesAgo(s.etaAt)} dk geçti, hâlâ ${statusDef(s.status).label}. Güvence kredisi otomatik devreye girer.`,
      meta: `${s.pickupDistrict} → ${s.dropDistrict}`,
    });
  }
  for (const s of unassigned) {
    alerts.push({
      level: "uyari",
      title: `${s.code} · kurye atanmadı`,
      detail: `${minutesAgo(s.createdAt)} dk önce oluşturuldu, hâlâ ${statusDef(s.status).label}.`,
      meta: s.tariffCode === "ekspres" ? "Ekspres: öncelikli" : "Standart kuyruk",
    });
  }
  for (const v of lowBattery) {
    alerts.push({
      level: "uyari",
      title: `${v.code} · batarya kritik`,
      detail: `Batarya %${v.batteryPercent}. Saha görevi açıldı mı kontrol et.`,
      meta: `${v.district} · ${v.kind}`,
    });
  }
  for (const t of openTasks) {
    alerts.push({
      level: "uyari",
      title: `${t.code} · saha görevi bekliyor`,
      detail: `${minutesAgo(t.createdAt)} dk önce açıldı, ${t.priority} öncelikli, henüz sahiplenilmedi.`,
      meta: `${t.district} · ${t.kind.replaceAll("_", " ")}`,
    });
  }
  for (const c of staleCouriers) {
    if (c.activeLoad === 0) continue;
    alerts.push({
      level: "bilgi",
      title: `${c.fullName} · konum güncel değil`,
      detail: `Üzerinde ${c.activeLoad} görev var ama son konum ${minutesAgo(c.lastSeenAt)} dk önce.`,
      meta: c.vehicle,
    });
  }

  const order = { kritik: 0, uyari: 1, bilgi: 2 } as const;
  alerts.sort((a, b) => order[a.level] - order[b.level]);
  const counts = {
    kritik: alerts.filter((a) => a.level === "kritik").length,
    uyari: alerts.filter((a) => a.level === "uyari").length,
    bilgi: alerts.filter((a) => a.level === "bilgi").length,
  };

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Uyarılar"
      subtitle="Kurallar veritabanındaki gerçek durumlardan türetilir; eşikler sabit değil, politika değerleridir."
      nav={[
        { href: "/ops", label: "Dispatch" },
        { href: "/ops/uyarilar", label: "Uyarılar" },
        { href: "/admin/finans", label: "Finans" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Kritik" value={String(counts.kritik)} tone={STATUS_COLOR.risk} />
        <Metric label="Uyarı" value={String(counts.uyari)} tone={STATUS_COLOR.waiting} />
        <Metric label="Bilgi" value={String(counts.bilgi)} tone={STATUS_COLOR.transit} />
      </div>

      <div className="mt-6">
        <Card title={`Uyarı akışı · ${alerts.length} kayıt`}>
          {alerts.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              Uyarı yok. SLA, atama kuyruğu, batarya ve çözüm taahhüdü eşiklerin içinde.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((alert, index) => {
                const color =
                  alert.level === "kritik"
                    ? STATUS_COLOR.risk
                    : alert.level === "uyari"
                      ? STATUS_COLOR.waiting
                      : STATUS_COLOR.transit;
                return (
                  <li key={`${alert.title}-${index}`} className="flex gap-3 py-3.5">
                    <span
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-sm font-bold text-[#0B1220]">{alert.title}</p>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color, backgroundColor: `${color}1a` }}
                        >
                          {alert.level}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{alert.detail}</p>
                      <p className="mt-1 text-xs text-slate-500">{alert.meta}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Eşikler (politika)">
          <ul className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <li>· SLA aşımı: tahmini teslim geçti ve durum terminal değil → kritik</li>
            <li>· Çözüm taahhüdü: istisna {GUARANTEE.resolutionSlaMinutes} dk içinde kapanmadı → kritik</li>
            <li>· Atama gecikmesi: 30 dk boyunca kurye atanmadı → uyarı</li>
            <li>· Batarya: %20 altı → uyarı</li>
            <li>· Saha görevi: 15 dk sahiplenilmedi → uyarı</li>
            <li>· Konum: aktif görevde 30 dk güncellenmedi → bilgi</li>
          </ul>
        </Card>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Bu ekran <StatusPill status="incelemede" /> gibi durum rozetlerini paylaşır; renk dili takip sayfasıyla aynıdır.
      </p>
    </PanelShell>
  );
}

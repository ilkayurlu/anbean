import PageShell from "@/components/PageShell";
import FleetMapClient from "@/components/FleetMapClient";
import { db } from "@/db";
import { iotVehicles, geoFences, fieldTasks, rides } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { STATUS_COLOR } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Filo Haritası — Anbean" };

export default async function FiloHaritasiPage() {
  const vehicles = await db.select().from(iotVehicles);
  const fences = await db.select().from(geoFences).where(eq(geoFences.isActive, true));
  const tasks = await db.select().from(fieldTasks).where(eq(fieldTasks.status, "acik"));

  // Giriş yapmış kullanıcının aktif sürüşü: sürüş ekranı ve "bitir" düğmesi için.
  const user = await getSessionUser();
  const activeRows = user
    ? await db
        .select()
        .from(rides)
        .where(and(eq(rides.riderId, user.id), eq(rides.status, "aktif")))
        .limit(1)
    : [];
  const activeVehicle = activeRows[0] ? vehicles.find((v) => v.id === activeRows[0].vehicleId) : undefined;
  const activeRide =
    activeRows[0] && activeVehicle
      ? {
          id: activeRows[0].id,
          code: activeRows[0].code,
          vehicleCode: activeVehicle.code,
          startedAt: new Date(activeRows[0].startedAt).toISOString(),
          perMinuteKurus: activeVehicle.perMinuteKurus,
        }
      : null;

  const available = vehicles.filter((v) => v.status === "available").length;
  const lowBattery = vehicles.filter((v) => v.batteryPercent < 30).length;
  const inUse = vehicles.filter((v) => v.status === "in_use").length;

  return (
    <PageShell
      eyebrow="Mikro-mobilite"
      title="Şehirdeki elektrikli filo, canlı"
      lead="Scooter, e-bisiklet ve moped. Tüm filo sıfır emisyonlu. Haritadan seç, kilidi uygulamadan aç, kullandığın dakika kadar öde."
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-white/3 p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Kullanıma hazır</p>
          <p className="mt-2 font-display text-2xl font-bold" style={{ color: STATUS_COLOR.delivered }}>
            {available}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/3 p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Şu an sürülüyor</p>
          <p className="mt-2 font-display text-2xl font-bold" style={{ color: STATUS_COLOR.transit }}>{inUse}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/3 p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Düşük batarya (&lt;%30)</p>
          <p className="mt-2 font-display text-2xl font-bold" style={{ color: STATUS_COLOR.waiting }}>
            {lowBattery}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/3 p-5">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Açık saha görevi</p>
          <p className="mt-2 font-display text-2xl font-bold" style={{ color: STATUS_COLOR.return }}>
            {tasks.length}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <FleetMapClient
          vehicles={vehicles}
          fences={fences}
          tasks={tasks}
          activeRide={activeRide}
          loggedIn={Boolean(user)}
        />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        <LegendCard color={STATUS_COLOR.delivered} title="Hazır">
          Kiralamaya uygun. Batarya ≥ %30.
        </LegendCard>
        <LegendCard color={STATUS_COLOR.waiting} title="Düşük batarya">
          Kurye tarafından batarya değişimi bekleniyor — ölü saatte ek gelir.
        </LegendCard>
        <LegendCard color={STATUS_COLOR.risk} title="Yasak bölge">
          Park yasağı bölgesi olarak işaretli. Demoda araç konumu simüle edildiği için kural henüz sürüşe uygulanmıyor.
        </LegendCard>
      </div>
    </PageShell>
  );
}

function LegendCard({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/3 p-5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="mt-2 text-sm text-slate-400">{children}</p>
    </div>
  );
}

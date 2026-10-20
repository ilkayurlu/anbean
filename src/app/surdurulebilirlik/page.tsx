import { sql } from "drizzle-orm";
import { db } from "@/db";
import { fieldTasks, iotVehicles, rides, shipments } from "@/db/schema";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import StatusStrip from "@/components/StatusStrip";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sürdürülebilirlik — Anbean",
  description:
    "Elektrikli filo metrikleri ve karbon tasarrufu tahmini. Varsayımlar açıkça belirtilir, sayılar veritabanından gelir.",
};

/**
 * Karbon varsayımı — açıkça etiketlenir, kesin değer gibi sunulmaz.
 * Hafif ticari dizel araç ~210 g CO2/km; elektrikli scooter/kargo bisikleti
 * şebeke emisyonuyla birlikte ~25 g CO2/km kabul edildi.
 */
const GRAM_CO2_PER_KM_COMBUSTION = 210;
const GRAM_CO2_PER_KM_ELECTRIC = 25;

export default async function SurdurulebilirlikPage() {
  const [fleet, rideAgg, taskAgg, shipmentAgg] = await Promise.all([
    db.select().from(iotVehicles).catch(() => []),
    db
      .select({
        rides: sql<number>`count(*)`,
        km: sql<number>`coalesce(sum(${rides.distanceKm}), 0)`,
      })
      .from(rides)
      .catch(() => [{ rides: 0, km: 0 }]),
    db
      .select({
        batterySwaps: sql<number>`count(*) filter (where ${fieldTasks.kind} = 'batarya_degisimi' and ${fieldTasks.status} = 'tamamlandi')`,
        collected: sql<number>`count(*) filter (where ${fieldTasks.kind} = 'ariza_toplama')`,
      })
      .from(fieldTasks)
      .catch(() => [{ batterySwaps: 0, collected: 0 }]),
    db
      .select({
        km: sql<number>`coalesce(sum(${shipments.distanceKm}), 0)`,
      })
      .from(shipments)
      .catch(() => [{ km: 0 }]),
  ]);

  const electricCount = fleet.length;
  const rideKm = Number(rideAgg[0]?.km ?? 0);
  const shipmentKm = Number(shipmentAgg[0]?.km ?? 0);
  const totalKm = rideKm + shipmentKm;
  const savedKg = Math.max(
    0,
    Math.round((totalKm * (GRAM_CO2_PER_KM_COMBUSTION - GRAM_CO2_PER_KM_ELECTRIC)) / 1000),
  );

  return (
    <PageShell
      eyebrow="Sürdürülebilirlik"
      title="Sıfır egzoz emisyonlu şehir lojistiği"
      lead="Filonun tamamı elektrikli: scooter, e-bisiklet ve moped. Aşağıdaki sayılar veritabanındaki kayıtlardan hesaplanır; karbon tasarrufu ise açıkça belirtilen bir varsayıma dayanır."
    >
      <Reveal>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { value: electricCount, suffix: "", label: "elektrikli araç", decimals: 0 },
            { value: Math.round(totalKm), suffix: " km", label: "kat edilen yol", decimals: 0 },
            { value: savedKg, suffix: " kg", label: "tahmini CO₂ tasarrufu", decimals: 0 },
            { value: Number(taskAgg[0]?.batterySwaps ?? 0), suffix: "", label: "tamamlanan batarya değişimi", decimals: 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-white/10 bg-white/3 p-6">
              <p className="font-display text-3xl font-bold text-accent">
                <CountUp value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              </p>
              <p className="mt-2 text-xs text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.05} className="mt-8">
        <div className="rounded-lg border border-st-waiting/30 bg-st-waiting/8 p-5">
          <p className="text-sm font-semibold text-white">Hesabın varsayımı</p>
          <p className="mt-2 text-sm text-slate-300">
            Tasarruf, aynı mesafenin hafif ticari dizel araçla ({GRAM_CO2_PER_KM_COMBUSTION} g CO₂/km) değil
            elektrikli araçla ({GRAM_CO2_PER_KM_ELECTRIC} g CO₂/km, şebeke emisyonu dahil) yapılması karşılaştırılarak
            hesaplanır. Bağımsız doğrulanmış bir rapor değildir; operasyon büyüdükçe gerçek şebeke ve araç verisiyle
            değiştirilecektir.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Batarya ikinci ömrü",
            body: "Bataryası %30 altına düşen araç otomatik saha görevine dönüşür. Araç çöpe gitmez, kurye tarafından değiştirilir.",
            status: "yeniden_planlandi",
          },
          {
            title: "Ölü saat yok",
            body: "Teslimat olmayan saatlerde kurye batarya değişimi ve arızalı araç toplama yaparak ek gelir elde eder; boş dönüşler azalır.",
            status: "gonderi_alindi",
          },
          {
            title: "Gürültü ve yerel hava",
            body: "Elektrikli filo egzoz emisyonu ve gürültü üretmez; yoğun saatlerde bölge kısıtlamalarına takılmaz.",
            status: "teslim_edildi",
          },
        ].map((card) => (
          <div key={card.title} className="rounded-lg border border-white/10 bg-white/3 p-6">
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{card.body}</p>
            <StatusStrip status={card.status} size="sm" className="mt-6" />
          </div>
        ))}
      </Reveal>

      <Reveal delay={0.15} className="mt-8">
        <div className="rounded-lg border border-white/10 bg-white/3 p-6 text-sm text-slate-400">
          Kayıt sayısı: {Number(rideAgg[0]?.rides ?? 0)} tamamlanmış sürüş · {Number(taskAgg[0]?.collected ?? 0)} araç
          toplama görevi. Bu sayılar canlı veritabanından okunur; sayfa her açıldığında güncellenir.
        </div>
      </Reveal>
    </PageShell>
  );
}

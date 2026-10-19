import Link from "next/link";
import { db } from "@/db";
import { iotVehicles } from "@/db/schema";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { STATE_COPY } from "@/lib/content";
import { formatTry } from "@/lib/pricing";
import { MODULES, MODULE_STATUS_LABEL } from "@/lib/brand";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Yolculuk — Anbean",
  description:
    "Elektrikli scooter, e-bisiklet ve moped kiralama. Sürücülü yolculuk hizmeti sunulmuyor; sahte müsaitlik gösterilmiyor.",
};

export default async function YolculukPage() {
  const vehicles = await db.select().from(iotVehicles).catch(() => []);
  const ready = vehicles.filter((v) => v.status === "available" && v.batteryPercent >= 20);
  const byKind = new Map<string, number>();
  for (const v of ready) byKind.set(v.kind, (byKind.get(v.kind) ?? 0) + 1);
  const minPrice = ready.length ? Math.min(...ready.map((v) => v.perMinuteKurus)) : null;
  const moduleStatus = MODULES.find((m) => m.key === "yolculuk")?.status ?? "sunulmuyor";

  return (
    <PageShell
      eyebrow={`Yolculuk · ${MODULE_STATUS_LABEL[moduleStatus]}`}
      title="Nereye gidiyorsun?"
      lead="Şehir içi hareket için elektrikli filo: scooter, e-bisiklet ve moped. Kilit açma sunucuda doğrulanır, ücret dakika bazlıdır."
    >
      <Reveal>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Kiralanabilir araç" value={String(ready.length)} />
          <Stat label="Scooter" value={String(byKind.get("scooter") ?? 0)} />
          <Stat label="E-bisiklet" value={String(byKind.get("ebike") ?? 0)} />
          <Stat label="Dakika ücreti" value={minPrice === null ? "—" : `${formatTry(minPrice)}'den`} />
        </div>
      </Reveal>

      <Reveal delay={0.05} className="mt-8">
        <div className="rounded-lg border border-white/10 bg-white/3 p-6">
          <h2 className="font-display text-xl font-semibold text-white">Elektrikli filoyu kirala</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Haritadan araç seç, batarya ve menzili gör, kilidi aç. Ücret sürüş bitince sunucuda hesaplanır ve platform
            bakiyenden düşer. Bataryası %20&apos;nin altındaki araçlar kiralanamaz.
          </p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { n: "1", t: "Aracı seç", d: "Haritada müsait araçlar yeşil, bataryası düşük olanlar kehribar." },
              { n: "2", t: "Kilidi aç", d: "İstek sunucuda doğrulanır; tarayıcı kilidi kendi başına açamaz." },
              { n: "3", t: "Bitir ve kilitle", d: "Süre × dakika ücreti hesaplanır, bakiyeden düşer." },
            ].map((step) => (
              <li key={step.n} className="rounded-md border border-white/8 bg-white/3 p-4">
                <span className="font-display text-2xl font-bold text-accent">{step.n}</span>
                <p className="mt-2 text-sm font-semibold text-white">{step.t}</p>
                <p className="mt-1 text-xs text-slate-400">{step.d}</p>
              </li>
            ))}
          </ol>
          <Link
            href="/filo-haritasi"
            className="mt-6 inline-block rounded-md bg-accent px-6 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft"
          >
            Haritada araç bul
          </Link>
        </div>
      </Reveal>

      <Reveal delay={0.1} className="mt-6">
        <div className="rounded-lg border border-st-waiting/35 bg-st-waiting/8 p-6">
          <h2 className="font-display text-lg font-semibold text-white">{STATE_COPY.noDriverService.title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">{STATE_COPY.noDriverService.body}</p>
          <p className="mt-3 text-xs text-slate-400">
            Sürücülü yolculuk hizmete alındığında bu sayfa güncellenir; o zamana kadar sahte sürücü pini, bekleme
            süresi veya fiyat tahmini gösterilmez.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.15} className="mt-6 grid gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/3 p-6">
          <h2 className="text-lg font-semibold text-white">Güvenlik</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>· Kask önerilir; trafik kuralları ve yerel hız sınırları geçerlidir.</li>
            <li>· Kırmızı alanlar park yasağı bölgesidir.</li>
            <li>· Demoda araç konumu simüle edildiği için bölge kuralları sürüşe henüz uygulanmıyor.</li>
            <li>· Konum verisi yalnızca kiralama süresince toplanır.</li>
          </ul>
          <Link href="/guvenlik" className="mt-4 inline-block text-sm font-semibold text-accent">
            Güvenlik sayfası →
          </Link>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/3 p-6">
          <h2 className="text-lg font-semibold text-white">Kurallar</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>· Kiralama koşulları ve sorumluluk sınırları</li>
            <li>· Hasar, kayıp ve kötüye kullanım</li>
            <li>· Yaş ve ehliyet gereklilikleri</li>
          </ul>
          <Link href="/yasal/mobilite-kiralama-kosullari" className="mt-4 inline-block text-sm font-semibold text-accent">
            Mikro-mobilite kiralama koşulları (taslak) →
          </Link>
        </div>
      </Reveal>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/3 p-5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

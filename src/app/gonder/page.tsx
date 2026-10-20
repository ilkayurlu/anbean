import Link from "next/link";
import { db } from "@/db";
import { serviceZones, shipments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import QuoteCalculator from "@/components/QuoteCalculator";
import TrackForm from "@/components/TrackForm";
import StatusStrip from "@/components/StatusStrip";
import { DEMO_TOKENS } from "@/lib/seed";
import { GUARANTEE } from "@/lib/guarantee";
import { STATUS_COLOR } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gönder — Anbean",
  description:
    "Şehir içi kurye ve aynı gün teslim. Ücreti onaydan önce gör, gönderiyi Durum Renk Şeridi ile takip et.",
};

export default async function GonderPage() {
  const [zoneRows, deliveryRows] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(serviceZones).where(eq(serviceZones.isActive, true)).catch(() => [{ n: 0 }]),
    db
      .select({
        delivered: sql<number>`count(*) filter (where ${shipments.status} = 'teslim_edildi')`,
      })
      .from(shipments)
      .catch(() => [{ delivered: 0 }]),
  ]);

  return (
    <PageShell
      eyebrow="Gönder · kullanıma açık"
      title="Paketini güvenle gönder"
      lead="Ücreti onaydan önce görürsün; fiyat yalnızca sunucuda hesaplanır. Takip sayfası adres ve telefon göstermez."
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="font-display text-xl font-semibold text-white">Ücreti hesapla</h2>
          <p className="mt-1 text-sm text-slate-400">Sürgüleri oynat; tutar sunucudan canlı gelir.</p>
          <div className="mt-5">
            <QuoteCalculator />
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-white/10 bg-white/3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">Gönderini takip et</h2>
            <div className="mt-4">
              <TrackForm />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
              {Object.values(DEMO_TOKENS).map((token) => (
                <Link
                  key={token}
                  href={`/takip/${token}`}
                  className="rounded-sm border border-white/12 bg-white/5 px-2 py-1 font-mono text-slate-400 hover:border-accent/50"
                >
                  {token}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-accent/25 bg-accent/6 p-5">
            <h2 className="text-sm font-semibold text-white">Teslimat Güvencesi</h2>
            <p className="mt-2 text-sm text-slate-300">
              Tahmini saat aşılırsa iade otomatik: 20 dk %25, 1 saat %50, 2 saat %100. İstisna çözüm taahhüdümüz{" "}
              {GUARANTEE.resolutionSlaMinutes} dakika.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Süre garantisi vermiyoruz; tahmin veriyoruz. Tahmin tutmazsa yaptırım kendiliğinden işler.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/3 p-5 text-sm text-slate-400">
            <p>
              <span className="font-display text-2xl font-bold text-white">{Number(zoneRows[0]?.n ?? 0)}</span> aktif
              hizmet ilçesi
            </p>
            <p className="mt-1">
              <span className="font-display text-2xl font-bold text-white">{Number(deliveryRows[0]?.delivered ?? 0)}</span>{" "}
              kayıtlı teslim
            </p>
          </div>
        </div>
      </div>

      <Reveal className="mt-12">
        <h2 className="font-display text-2xl font-bold text-white">Nasıl çalışır?</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-4">
          {[
            { t: "Adresleri gir", d: "Alım ve teslim adresi, paket türü, ağırlık.", status: "alim_planlandi" },
            { t: "Ücreti gör", d: "Taban + mesafe + ağırlık + bölge farkı ayrı satırlarda.", status: "fiyat_onayi_bekliyor" },
            { t: "Kurye alır", d: "Atama sunucuda yapılır; kurye yalnızca kendi görevini görür.", status: "gonderi_alindi" },
            { t: "Teslim edilir", d: "Kanıt kaydı ve durum şeridi; teslimde güvence değerlendirmesi.", status: "teslim_edildi" },
          ].map((step, index) => (
            <div key={step.t} className="rounded-lg border border-white/10 bg-white/3 p-5">
              <span className="font-display text-2xl font-bold" style={{ color: STATUS_COLOR.transit }}>
                {index + 1}
              </span>
              <p className="mt-2 font-semibold text-white">{step.t}</p>
              <p className="mt-1 text-sm text-slate-400">{step.d}</p>
              <StatusStrip status={step.status} size="sm" className="mt-4" />
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/giris" className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft">
            Giriş yap ve gönderi oluştur
          </Link>
          <Link href="/yasal/yasakli-gonderiler" className="rounded-md border border-white/15 px-6 py-3 text-sm text-slate-200">
            Yasaklı gönderiler
          </Link>
        </div>
      </Reveal>
    </PageShell>
  );
}

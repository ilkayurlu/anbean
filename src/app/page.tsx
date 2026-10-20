import Link from "next/link";
import { preload } from "react-dom";
import { eq, sql } from "drizzle-orm";
import { ArrowRight, BatteryMedium, ShieldCheck, Wallet, Zap } from "lucide-react";
import { db } from "@/db";
import { iotVehicles, serviceZones, shipments, type IotVehicle } from "@/db/schema";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CTA, MODULES } from "@/lib/brand";
import { FaqJsonLd } from "@/components/JsonLd";
import { FAQ } from "@/lib/content";
import TrackForm from "@/components/TrackForm";
import LiveStripDemo from "@/components/LiveStripDemo";
import CountUp from "@/components/CountUp";
import StatusStrip from "@/components/StatusStrip";
import HeroVideo from "@/components/HeroVideo";
import Reveal from "@/components/Reveal";
import { ModePanels, ModeSwitch } from "@/components/HeroMode";
import { getMediaSlots, slotOrFallback } from "@/lib/media";
import { DEMO_TOKENS } from "@/lib/seed";
import { formatTry } from "@/lib/pricing";
import { GUARANTEE } from "@/lib/guarantee";
import { STATUS_COLOR, STRIP_SEGMENTS } from "@/lib/status";

export const dynamic = "force-dynamic";

/** Pexels CDN boyutlandırması: kırpma yok, yalnızca genişlik. */
function pexelsAtWidth(url: string, width: number): string {
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.delete("h");
    u.searchParams.delete("fit");
    return u.toString();
  } catch {
    return url;
  }
}

export default async function HomePage() {
  const [slots, zoneRows, vehicles, deliveryRows] = await Promise.all([
    getMediaSlots(),
    db
      .select({ n: sql<number>`count(*)` })
      .from(serviceZones)
      .where(eq(serviceZones.isActive, true))
      .catch((): { n: number }[] => [{ n: 0 }]),
    db
      .select()
      .from(iotVehicles)
      .catch((): IotVehicle[] => []),
    // Sayaçlar gerçek kayıtlardan: uydurma "50.000+ teslimat" yok.
    db
      .select({
        delivered: sql<number>`count(*) filter (where ${shipments.status} = 'teslim_edildi')`,
        onTime: sql<number>`count(*) filter (where ${shipments.status} = 'teslim_edildi' and ${shipments.deliveredAt} <= ${shipments.etaAt})`,
        total: sql<number>`count(*)`,
      })
      .from(shipments)
      .catch(() => [{ delivered: 0, onTime: 0, total: 0 }]),
  ]);

  const hero = slotOrFallback(slots, "home.hero");
  const trust = slotOrFallback(slots, "home.trust");

  // Sahte istatistik yok: hepsi veritabanından ya da yazılı politikadan.
  const zoneCount = Number(zoneRows[0]?.n ?? 0);
  const ready = vehicles.filter((v) => v.status === "available" && v.batteryPercent >= 20);
  const minPerMinute = ready.length ? Math.min(...ready.map((v) => v.perMinuteKurus)) : null;
  const deliveredCount = Number(deliveryRows[0]?.delivered ?? 0);
  const onTimeRate = deliveredCount > 0 ? Math.round((Number(deliveryRows[0]?.onTime ?? 0) / deliveredCount) * 100) : 0;

  const posterBase = hero.kind === "video" && hero.url ? hero.posterUrl : null;
  const heroVideo =
    posterBase && hero.url
      ? {
          src: hero.url,
          poster: pexelsAtWidth(posterBase, 1280),
          srcSet: [768, 1280, 1920].map((w) => `${pexelsAtWidth(posterBase, w)} ${w}w`).join(", "),
        }
      : null;
  if (heroVideo) {
    preload(heroVideo.poster, {
      as: "image",
      fetchPriority: "high",
      imageSrcSet: heroVideo.srcSet,
      imageSizes: "100vw",
    });
  }

  const gonderHero = (
    <div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Şehir içi · aynı gün · İstanbul
      </p>
      <h1 className="mt-3 text-4xl leading-[1.08] font-bold text-white sm:text-5xl lg:text-6xl">
        Şehirde neye ihtiyacın varsa, <span className="text-accent">tek hareketle</span>.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-slate-300">
        Hız yarışı değil, görünürlük. Her gönderi tek bir renk şeridiyle temsil edilir: dolu kısım geçilen yolu,
        soluk kısım kalan yolu gösterir.
      </p>
      <div className="mt-8 max-w-2xl">
        <TrackForm size="lg" />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Denemek için:</span>
          {Object.entries(DEMO_TOKENS).map(([key, token]) => (
            <Link
              key={key}
              href={`/takip/${token}`}
              className="rounded-sm border border-white/12 bg-white/5 px-2.5 py-1 font-mono text-[11px] tracking-wider text-slate-300 transition hover:border-accent/50 hover:text-white"
            >
              {token}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );

  const surHero = (
    <div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Elektrikli filo · dakika bazlı
      </p>
      <h1 className="mt-3 text-4xl leading-[1.08] font-bold text-white sm:text-5xl lg:text-6xl">
        Yakındaki <span className="text-accent">elektrikli</span> aracı bul, kilidi aç, sür.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-slate-300">
        Scooter, e-bisiklet ve moped. Dakika ücreti kurye gönderilerinle aynı cüzdandan düşer; kilit açma yetkisi
        yalnızca sunucuda.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/filo-haritasi"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-4 text-base font-semibold text-[#0B1220] transition hover:bg-accent-soft"
        >
          Haritada araç bul <ArrowRight size={18} aria-hidden />
        </Link>
        <Link
          href="/app/cuzdan"
          className="inline-flex items-center gap-2 rounded-md border border-white/15 px-6 py-4 text-base text-slate-200 transition hover:border-white/35"
        >
          <Wallet size={18} aria-hidden /> Cüzdan
        </Link>
      </div>
      <p className="mt-5 text-sm text-slate-400">
        {ready.length} araç şu an kiralanabilir
        {minPerMinute !== null ? ` · dakikası ${formatTry(minPerMinute)}` : ""}
      </p>
    </div>
  );

  const gonderSide = (
    <div className="flex flex-col gap-4">
      <LiveStripDemo />
      <div className="rounded-lg border border-white/10 bg-white/3 p-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Şerit nasıl okunur</p>
        <ul className="mt-4 space-y-2.5">
          {STRIP_SEGMENTS.map((segment, i) => (
            <li key={segment.key} className="flex items-center gap-3 text-sm text-slate-300">
              <span
                className="h-2.5 w-7 rounded-[2px]"
                style={{ backgroundColor: STATUS_COLOR[segment.kind], opacity: 0.35 + i * 0.13 }}
              />
              {segment.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const surSide = (
    <div className="rounded-lg border border-white/10 bg-white/4 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Şu an hazır</p>
        <span className="inline-flex items-center gap-2 text-xs text-slate-400">
          <span className="live-dot" aria-hidden /> canlı filo
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {ready.slice(0, 4).map((v) => (
          <li key={v.id} className="rounded-md border border-white/8 bg-white/3 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-display font-semibold text-white">{v.code}</span>
              <span className="text-xs text-slate-400">
                {v.kind} · {v.district}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <BatteryMedium size={14} aria-hidden className="text-slate-400" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-white/10">
                <div className="h-full rounded-[3px] bg-accent" style={{ width: `${v.batteryPercent}%` }} />
              </div>
              <span className="w-10 text-right text-xs tabular-nums text-slate-300">%{v.batteryPercent}</span>
            </div>
          </li>
        ))}
        {ready.length === 0 ? <li className="text-sm text-slate-500">Şu an kiralanabilir araç yok.</li> : null}
      </ul>
      <Link href="/filo-haritasi" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
        Tüm filo <ArrowRight size={14} aria-hidden />
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-deep">
      <SiteHeader />

      {/* HERO — tek odak; aksan, seçilen moda göre akarak değişir */}
      <section className="relative overflow-hidden border-b border-white/8">
        {heroVideo ? (
          <HeroVideo src={heroVideo.src} poster={heroVideo.poster} posterSrcSet={heroVideo.srcSet} />
        ) : null}
        <div className="hero-glow absolute inset-0" aria-hidden />
        <div className="route-lines absolute inset-0 opacity-70" aria-hidden />
        <svg
          className="absolute inset-0 h-full w-full opacity-60"
          viewBox="0 0 1200 600"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          <path
            className="route-dash stroke-accent"
            d="M-20 420 C 220 420, 240 220, 470 220 S 760 360, 980 190 L 1240 150"
            strokeWidth="2"
          />
          <path
            className="route-dash"
            style={{ animationDuration: "22s" }}
            d="M-20 520 C 300 520, 420 480, 620 380 S 980 300, 1240 330"
            stroke="rgba(148,163,184,0.45)"
            strokeWidth="1.5"
          />
        </svg>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <ModeSwitch />
              <nav aria-label="Hizmetler" className="flex flex-wrap gap-2">
                {MODULES.map((module) => (
                  <Link
                    key={module.key}
                    href={module.href}
                    className="min-h-11 rounded-full border border-white/12 px-4 py-2 text-sm text-slate-300 transition hover:border-accent/50 hover:text-white"
                  >
                    {module.label}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500">
                      {module.status === "hazir" ? "açık" : module.status === "pilot" ? "pilot" : "yok"}
                    </span>
                  </Link>
                ))}
              </nav>
            </div>
            <ModePanels gonder={gonderHero} sur={surHero} className="min-h-[420px] lg:min-h-[470px]" />

            <div className="mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-md border border-white/8 bg-white/3 p-4">
                <p className="font-display text-2xl font-bold text-white">
                  <CountUp value={deliveredCount} />
                </p>
                <p className="mt-1 text-xs text-slate-500">kayıtlı teslim</p>
              </div>
              <div className="rounded-md border border-white/8 bg-white/3 p-4">
                <p className="font-display text-2xl font-bold text-white">
                  <CountUp value={onTimeRate} suffix="%" />
                </p>
                <p className="mt-1 text-xs text-slate-500">zamanında (teslim edilenlerde)</p>
              </div>
              <div className="rounded-md border border-white/8 bg-white/3 p-4">
                <p className="font-display text-2xl font-bold text-white">
                  <CountUp value={zoneCount} />
                </p>
                <p className="mt-1 text-xs text-slate-500">aktif hizmet ilçesi</p>
              </div>
              <div className="rounded-md border border-white/8 bg-white/3 p-4">
                <p className="font-display text-2xl font-bold text-white">
                  <CountUp value={ready.length} />
                </p>
                <p className="mt-1 text-xs text-slate-500">kiralanabilir araç</p>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-[11px] text-slate-600">
              Sayaçlar veritabanındaki kayıtlardan gelir, tanıtım amaçlı şişirilmiş sayı değildir. İstisna çözüm
              taahhüdümüz {GUARANTEE.resolutionSlaMinutes} dakikadır.
            </p>
          </div>

          <ModePanels gonder={gonderSide} sur={surSide} className="flex flex-col justify-center" />
        </div>
      </section>

      {/* HİZMETLER — her hizmet kendi durum rengiyle kodlu */}
      <section className="bg-[#0a101c] py-20">
        <Reveal className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl font-bold text-white">Üç operasyon modeli</h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Her model kendi renk kodunu taşır; panelde, kurye ekranında ve takip sayfasında aynı renk görünür.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "Şehir İçi",
                color: STATUS_COLOR.transit,
                sla: "5 saat içinde",
                desc: "Aynı şehirde standart teslim. Gün içi toplu alım, bölge bazlı rota.",
                status: "gonderi_alindi",
              },
              {
                title: "Ekspres",
                color: STATUS_COLOR.waiting,
                sla: "90 dakika hedef",
                desc: "Alımdan teslime tek kurye, aktarmasız. Öncelikli atama kuyruğu.",
                status: "dagitima_cikti",
              },
              {
                title: "Kurumsal",
                color: STATUS_COLOR.delivered,
                sla: "SLA + API",
                desc: "Hacim tarifesi, durum bildirimleri, aylık mutabakat raporu.",
                status: "teslim_edildi",
              },
            ].map((service) => (
              <div
                key={service.title}
                className="rounded-lg border border-white/8 bg-white/3 p-6 transition hover:border-white/20"
              >
                <span
                  className="inline-block rounded-sm px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
                  style={{ color: service.color, backgroundColor: `${service.color}1f` }}
                >
                  {service.sla}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-white">{service.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{service.desc}</p>
                <StatusStrip status={service.status} size="md" className="mt-6" />
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* BUGÜN NE YAPMAK İSTİYORSUN — asimetrik: yemek geniş, diğer ikisi üst üste */}
      <section className="border-t border-white/8 py-20">
        <Reveal className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl font-bold text-white">Bugün ne yapmak istiyorsun?</h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Üç ihtiyaç, tek hesap. Ücreti onaydan önce görürsün; süreci canlı takip edersin.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <Link
              href="/yemek"
              className="group relative overflow-hidden rounded-lg border border-gonder/30 bg-gonder/8 p-8 transition hover:border-gonder/60"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-gonder">Yemek · pilot bölgede</p>
              <h3 className="mt-3 font-display text-3xl font-bold text-white">{MODULES[0].intent}</h3>
              <p className="mt-3 max-w-lg text-sm text-slate-300">{MODULES[0].summary}</p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gonder">
                Menüye göz at <ArrowRight size={15} aria-hidden />
              </p>
              <p className="mt-4 text-[11px] text-slate-500">
                Katalog demo işletmelerden oluşur; sahte puan ve yorum gösterilmez.
              </p>
            </Link>
            <div className="grid gap-5">
              <Link
                href="/yolculuk"
                className="group rounded-lg border border-sur/30 bg-sur/8 p-6 transition hover:border-sur/60"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-sur">Yolculuk · açık</p>
                <h3 className="mt-2 font-display text-xl font-bold text-white">{MODULES[1].intent}</h3>
                <p className="mt-2 text-sm text-slate-300">{MODULES[1].summary}</p>
              </Link>
              <Link
                href="/gonder"
                className="group rounded-lg border border-white/10 bg-white/3 p-6 transition hover:border-accent/50"
              >
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Gönder · açık</p>
                <h3 className="mt-2 font-display text-xl font-bold text-white">{MODULES[2].intent}</h3>
                <p className="mt-2 text-sm text-slate-400">{MODULES[2].summary}</p>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* SSS — yapılandırılmış veri yalnızca gerçek soru/cevaplarla */}
      <section className="border-t border-white/8 bg-[#0a101c] py-20">
        <Reveal className="mx-auto max-w-6xl px-5">
          <h2 className="text-3xl font-bold text-white">Sık sorulanlar</h2>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {FAQ.map((item) => (
              <details key={item.q} className="rounded-lg border border-white/10 bg-white/3 p-5">
                <summary className="cursor-pointer list-none font-semibold text-white">
                  <span className="mr-2 text-accent">+</span>
                  {item.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
              </details>
            ))}
          </div>
          <FaqJsonLd items={FAQ.map((item) => ({ q: item.q, a: item.a }))} />
          <Link href="/yardim" className="mt-6 inline-block text-sm font-semibold text-accent">
            {CTA.help} merkezine git →
          </Link>
        </Reveal>
      </section>

      {/* TEK CÜZDAN — iki ürün, tek bakiye */}
      <section className="border-t border-white/8 py-20">
        <Reveal className="mx-auto max-w-6xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
            <span className="h-2 w-2 rounded-full bg-gonder" aria-hidden />
            <span className="h-2 w-2 rounded-full bg-sur" aria-hidden />
            Tek uygulama · tek cüzdan
          </span>
          <h2 className="mt-5 max-w-3xl text-3xl font-bold text-white sm:text-4xl">
            Aynı cüzdanla kurye gönder, scooter kirala
          </h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Gönderi ücreti, sürüş ücreti ve güvence iadeleri aynı bakiyede buluşur. Her hareket çift taraflı kayıtla
            yazılır ve veritabanında değiştirilemez.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <Link
              href="/fiyat-al"
              className="group rounded-lg border border-white/10 bg-white/3 p-6 transition hover:border-gonder/50"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gonder" aria-hidden />
                <h3 className="text-lg font-semibold text-white">Gönder</h3>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Şehir içi aynı gün teslim. Ücret cüzdandan düşer; kurumsal hesaplar faturayla öder.
              </p>
              <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-gonder">
                Fiyat al <ArrowRight size={13} aria-hidden />
              </p>
            </Link>
            <Link
              href="/filo-haritasi"
              className="group rounded-lg border border-white/10 bg-white/3 p-6 transition hover:border-sur/50"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sur" aria-hidden />
                <h3 className="text-lg font-semibold text-white">Sür</h3>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Scooter, e-bisiklet, moped. Bakiye yetmese de sürüş biter ve araç kilitlenir; eksi bakiyede yeni sürüş
                başlamaz. Platform bakiyesi demo amaçlıdır, elektronik para değildir.
              </p>
              <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sur">
                Araç bul <ArrowRight size={13} aria-hidden />
              </p>
            </Link>
            <Link
              href="/kurye-basvur"
              className="group rounded-lg border border-white/10 bg-white/3 p-6 transition hover:border-white/25"
            >
              <div className="flex items-center gap-2">
                <Zap size={15} aria-hidden className="text-slate-300" />
                <h3 className="text-lg font-semibold text-white">Hibrit filo</h3>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                Teslimat olmayan saatte kurye batarya değişimi alır; hakediş görevi sahiplendiği an cüzdanına geçer.
              </p>
              <p className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-300">
                Kurye ol <ArrowRight size={13} aria-hidden />
              </p>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* TESLİMAT GÜVENCESİ */}
      <section className="border-t border-white/8 bg-[#0a101c] py-20">
        <Reveal className="mx-auto max-w-6xl px-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            <ShieldCheck size={14} aria-hidden /> Teslimat Güvencesi
          </span>
          <h2 className="mt-5 max-w-3xl text-3xl font-bold text-white">Vaat tutmazsa, sen istemeden iade</h2>
          <p className="mt-3 max-w-2xl text-slate-400">
            Tahmini teslim saati aşılırsa kredi otomatik açılır ve cüzdanına işlenir; destek aramana, form doldurmana
            gerek kalmaz.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {[
              { head: "20 dk aşım", value: "%25", note: "teslimat ücreti iadesi" },
              { head: "1 saat aşım", value: "%50", note: "teslimat ücreti iadesi" },
              { head: "2 saat aşım", value: "%100", note: "teslimat ücreti iadesi" },
              { head: "İstisna çözümü", value: `${GUARANTEE.resolutionSlaMinutes} dk`, note: "operasyon karar taahhüdü" },
            ].map((tier) => (
              <div key={tier.head} className="rounded-lg border border-white/10 bg-white/3 p-6">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{tier.head}</p>
                <p className="mt-3 font-display text-3xl font-bold text-accent">{tier.value}</p>
                <p className="mt-1 text-xs text-slate-500">{tier.note}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* GÜVEN BANDI */}
      <section className="py-20">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
          <div className="overflow-hidden rounded-lg border border-white/8">
            {trust.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trust.url} alt="Paket teslim eden kurye" className="h-72 w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-72 w-full" style={{ background: trust.fallbackCss }} />
            )}
            <p className="bg-[#0a101c] px-4 py-2 text-[11px] text-slate-500">
              Görsel: {trust.credit} · Fotoğraftaki kişiler Anbean çalışanı değildir.
            </p>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Belirsizlik, gecikmeden pahalıdır</h2>
            <p className="mt-4 text-slate-400">
              Her durum geçişi otomatik bildirim üretir, istisnalar ayrı kuyruğa düşer, teslim kanıtı kayda geçer.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {[
                "Takip sayfası adres ve telefon göstermez; alıcı adı maskelenir",
                "Para hareketleri ve denetim kaydı veritabanı seviyesinde değiştirilemez",
                "Kurye yalnızca kendisine atanmış gönderiyi görür",
                "Fiyat yalnızca sunucuda hesaplanır, tarayıcıdan tutar kabul edilmez",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/fiyat-al"
                className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft"
              >
                Anlık fiyat al
              </Link>
              <Link
                href="/kurumsal"
                className="rounded-md border border-white/15 px-5 py-3 text-sm text-slate-200 transition hover:border-white/35"
              >
                Kurumsal & API
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}

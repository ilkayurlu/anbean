import PageShell from "@/components/PageShell";
import StatusStrip from "@/components/StatusStrip";
import { getMediaSlots, slotOrFallback } from "@/lib/media";
import { db } from "@/db";
import { tariffs } from "@/db/schema";
import { STATUS_COLOR, type StatusKind } from "@/lib/status";
import { formatTry } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hizmetlerimiz — Anbean" };

export default async function HizmetlerPage() {
  const slots = await getMediaSlots();
  const city = slotOrFallback(slots, "services.city");
  const corporate = slotOrFallback(slots, "services.corporate");
  const rows = await db.select().from(tariffs).catch(() => []);

  return (
    <PageShell
      eyebrow="Operasyon modelleri"
      title="Her hizmet kendi renginde kodlanır"
      lead="Tarife seçimi yalnızca fiyatı değil; atama önceliğini, SLA penceresini ve şeritteki rengi belirler."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {rows.map((tariff) => {
          const color = STATUS_COLOR[tariff.accentStatus as StatusKind] ?? STATUS_COLOR.transit;
          return (
            <article
              key={tariff.code}
              className="rounded-lg border border-white/10 bg-white/3 p-6"
              style={{ borderTop: `3px solid ${color}` }}
            >
              <h2 className="text-xl font-semibold text-white">{tariff.name}</h2>
              <p className="mt-2 min-h-16 text-sm text-slate-400">{tariff.description}</p>
              <p className="mt-4 font-display text-2xl font-bold text-white">
                {formatTry(tariff.baseKurus)}
                <span className="ml-1 text-sm font-normal text-slate-500">taban</span>
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
                <li>Km başına {formatTry(tariff.perKmKurus)}</li>
                <li>Kg başına {formatTry(tariff.perKgKurus)}</li>
                <li>SLA {Math.round(tariff.slaMinutes / 60)} saat</li>
              </ul>
              <StatusStrip status="dagitima_cikti" size="md" className="mt-6" />
            </article>
          );
        })}
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {[
          {
            slot: city,
            title: "Şehir içi ve ekspres",
            body: "İstanbul'da 19 ilçede aktif. Ekspreste aktarma yoktur: alan kurye teslim eder, şerit dört segmentte tamamlanır.",
          },
          {
            slot: corporate,
            title: "Kurumsal hacim",
            body: "Günlük 50+ gönderide sözleşmeli tarife, API ile toplu oluşturma, webhook ile durum bildirimi ve aylık mutabakat.",
          },
        ].map((block) => (
          <div key={block.title} className="overflow-hidden rounded-lg border border-white/10 bg-white/3">
            {block.slot.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.slot.url} alt={block.title} className="h-56 w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-56 w-full" style={{ background: block.slot.fallbackCss }} />
            )}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white">{block.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{block.body}</p>
              <p className="mt-4 text-[11px] text-slate-600">Görsel: {block.slot.credit}</p>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, restaurants } from "@/db/schema";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { STATE_COPY } from "@/lib/content";
import { formatTry } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Yemek — Anbean",
  description:
    "Pilot yemek kataloğu: menü, alerjen bilgisi ve sipariş onayından önce ayrıntılı ücret dökümü. İşletmeler demo verisidir.",
};

export default async function YemekPage() {
  const venues = await db.select().from(restaurants).orderBy(desc(restaurants.isOpen)).catch(() => []);
  const items = await db.select().from(menuItems).catch(() => []);

  const itemCountByVenue = new Map<number, number>();
  for (const item of items) {
    itemCountByVenue.set(item.restaurantId, (itemCountByVenue.get(item.restaurantId) ?? 0) + 1);
  }
  const cuisines = Array.from(new Set(venues.map((v) => v.cuisine))).filter(Boolean);

  return (
    <PageShell
      eyebrow="Yemek · pilot bölge"
      title="Bugün ne yemek istersin?"
      lead="Ücret dökümünü siparişi onaylamadan önce görürsün: ürün, teslimat, hizmet ve varsa küçük sepet bedeli ayrı satırlarda."
    >
      <div className="rounded-lg border border-st-waiting/35 bg-st-waiting/8 p-5">
        <p className="text-sm font-semibold text-white">{STATE_COPY.demoCatalog.title}</p>
        <p className="mt-1.5 text-sm text-slate-300">{STATE_COPY.demoCatalog.body}</p>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {cuisines.map((cuisine) => (
          <span
            key={cuisine}
            className="rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-sm text-slate-300"
          >
            {cuisine}
          </span>
        ))}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue, index) => {
          const closed = !venue.isOpen;
          return (
            <Reveal key={venue.id} delay={index * 0.04}>
              <Link
                href={`/yemek/${venue.slug}`}
                className={`block h-full rounded-lg border p-6 transition ${
                  closed
                    ? "border-white/8 bg-white/2 opacity-70"
                    : "border-white/10 bg-white/3 hover:border-accent/45"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold text-white">{venue.name}</h2>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      color: closed ? "#FCA5A5" : "#86EFAC",
                      backgroundColor: closed ? "rgba(220,38,38,0.16)" : "rgba(22,163,74,0.16)",
                    }}
                  >
                    {closed ? "Kapalı" : "Açık"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {venue.cuisine} · {venue.district}
                </p>
                {venue.isDemo ? (
                  <p className="mt-3 inline-block rounded-sm border border-white/12 px-2 py-0.5 text-[11px] text-slate-400">
                    Pilot · demo işletme
                  </p>
                ) : null}
                <dl className="mt-4 space-y-1.5 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Hazırlık</dt>
                    <dd>~{venue.prepMinutes} dk</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Teslimat bedeli</dt>
                    <dd>{formatTry(venue.deliveryFeeKurus)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Minimum sepet</dt>
                    <dd>{formatTry(venue.minBasketKurus)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Menü</dt>
                    <dd>{itemCountByVenue.get(venue.id) ?? 0} ürün</dd>
                  </div>
                </dl>
                {/* Sahte puan/yorum yok: işletme değerlendirmesi gerçek veri gelene kadar gösterilmez. */}
              </Link>
            </Reveal>
          );
        })}
      </div>

      {venues.length === 0 ? (
        <p className="py-12 text-center text-slate-400">Katalog hazırlanıyor.</p>
      ) : null}
    </PageShell>
  );
}

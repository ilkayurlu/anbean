import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { menuItems, restaurants } from "@/db/schema";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import AddToCartButton from "@/components/AddToCartButton";
import Reveal from "@/components/Reveal";
import { STATE_COPY } from "@/lib/content";
import { formatTry } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [venue] = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1).catch(() => []);
  if (!venue) return { title: "İşletme bulunamadı — Anbean" };
  return {
    title: `${venue.name} — Anbean Yemek`,
    description: `${venue.cuisine} · ${venue.district}. Menü, alerjen bilgisi ve sipariş öncesi ücret dökümü.`,
  };
}

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [venue] = await db.select().from(restaurants).where(eq(restaurants.slug, slug)).limit(1).catch(() => []);
  if (!venue) notFound();

  const items = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.restaurantId, venue.id)))
    .orderBy(asc(menuItems.sortIndex));

  const categories = Array.from(new Set(items.map((item) => item.category)));

  // Restoran/MenuItem structured data BİLİNÇLİ olarak üretilmiyor:
  // katalog demo verisi, schema.org sahte işletme bilgisi anlamına gelir.
  return (
    <div className="min-h-screen bg-deep">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          <Link href="/yemek" className="hover:text-accent">
            Yemek
          </Link>
          <span aria-hidden> / </span>
          <span className="text-slate-300">{venue.name}</span>
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-bold text-white">{venue.name}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {venue.cuisine} · {venue.district} · hazırlık ~{venue.prepMinutes} dk
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                color: venue.isOpen ? "#86EFAC" : "#FCA5A5",
                backgroundColor: venue.isOpen ? "rgba(22,163,74,0.16)" : "rgba(220,38,38,0.16)",
              }}
            >
              {venue.isOpen ? "Açık" : "Şu an kapalı"}
            </span>
          </div>

          {venue.isDemo ? (
            <p className="mt-4 rounded-md border border-st-waiting/35 bg-st-waiting/8 p-3 text-sm text-slate-300">
              <strong className="text-white">{STATE_COPY.demoCatalog.title}:</strong> {venue.note}
            </p>
          ) : null}

          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              { label: "Minimum sepet", value: formatTry(venue.minBasketKurus) },
              { label: "Teslimat bedeli", value: formatTry(venue.deliveryFeeKurus) },
              { label: "Hizmet bedeli", value: formatTry(venue.serviceFeeKurus) },
              { label: "Küçük sepet bedeli", value: formatTry(venue.smallBasketFeeKurus) },
            ].map((row) => (
              <div key={row.label} className="rounded-md border border-white/8 bg-white/3 p-3">
                <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500">{row.label}</dt>
                <dd className="mt-1 font-display font-bold text-white">{row.value}</dd>
              </div>
            ))}
          </dl>
        </header>

        {!venue.isOpen ? (
          <p className="mt-6 rounded-md border border-st-risk/35 bg-st-risk/8 p-4 text-sm text-slate-300">
            {STATE_COPY.venueClosed.body}
          </p>
        ) : null}

        {categories.map((category, index) => (
          <Reveal key={category} delay={index * 0.03}>
            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold text-white">{category}</h2>
              <ul className="mt-4 divide-y divide-white/8 border-y border-white/8">
                {items
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-100">
                          {item.name}
                          {!item.isAvailable ? (
                            <span className="ml-2 rounded-sm bg-st-risk/15 px-2 py-0.5 text-[11px] text-st-risk">
                              tükendi
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          Alerjen: {item.allergens || "belirtilmedi"} · {formatTry(item.priceKurus)}
                        </p>
                      </div>
                      <AddToCartButton
                        restaurantSlug={venue.slug}
                        menuItemId={item.id}
                        available={item.isAvailable && venue.isOpen}
                      />
                    </li>
                  ))}
              </ul>
            </section>
          </Reveal>
        ))}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/sepet"
            className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft"
          >
            Sepeti gör
          </Link>
          <Link
            href="/yemek"
            className="rounded-md border border-white/15 px-6 py-3 text-sm text-slate-200 transition hover:border-white/35"
          >
            Diğer işletmeler
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

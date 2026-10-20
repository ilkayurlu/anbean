import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import { CLASSIFICATION_LABEL, findPolicy, POLICIES } from "@/lib/policies";
import { BRAND } from "@/lib/brand";

export const dynamicParams = false;

export function generateStaticParams() {
  return POLICIES.flatMap((policy) => [policy.slug, ...(policy.aliases ?? [])].map((slug) => ({ slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = findPolicy(slug);
  if (!policy) return { title: "Belge bulunamadı — Anbean" };
  return {
    title: `${policy.title} (taslak) — Anbean`,
    description: policy.summary,
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = findPolicy(slug);
  if (!policy) notFound();

  const canonical = policy.slug !== slug ? `/yasal/${policy.slug}` : undefined;

  return (
    <PageShell eyebrow="Yasal · taslak" title={policy.title}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div>
          <div className="rounded-lg border border-st-waiting/40 bg-st-waiting/10 p-5">
            <p className="text-sm font-semibold text-white">Taslak — hukuk danışmanı onayı gereklidir</p>
            <p className="mt-2 text-sm text-slate-300">
              Bu belge yayınlanmış bir sözleşme değildir ve hukuki tavsiye yerine geçmez. Aşağıdaki kapsam, onay
              sürecine hazırlık için çıkarılmıştır. Onay gelmeden yürürlüğe girmez.
            </p>
          </div>

          <p className="mt-6 text-slate-300">{policy.summary}</p>

          <h2 className="mt-8 font-display text-lg font-semibold text-white">Kapsam</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            {policy.covers.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>

          <p className="mt-8 text-xs text-slate-500">
            Soru ve başvurular: {policy.contact} · {BRAND.legalName}
          </p>
          {canonical ? (
            <p className="mt-2 text-xs text-slate-600">
              Bu adres eski bir bağlantı; güncel adres <Link href={canonical} className="text-accent">{canonical}</Link>.
            </p>
          ) : null}
        </div>

        <aside className="h-fit rounded-lg border border-white/10 bg-white/3 p-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Belge künyesi</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              { label: "Durum", value: policy.status === "taslak" ? "Taslak" : policy.status },
              { label: "Sürüm", value: policy.version },
              { label: "Yürürlük tarihi", value: policy.effectiveDate },
              { label: "Son güncelleme", value: policy.lastUpdated },
              { label: "Belge sahibi", value: policy.owner },
              { label: "Sınıflandırma", value: CLASSIFICATION_LABEL[policy.classification] },
              { label: "Değişiklik özeti", value: policy.changeSummary },
            ].map((row) => (
              <div key={row.label}>
                <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500">{row.label}</dt>
                <dd className="mt-0.5 text-slate-200">{row.value}</dd>
              </div>
            ))}
          </dl>
          <Link href="/yasal" className="mt-5 inline-block text-sm font-semibold text-accent">
            Tüm belgeler →
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}

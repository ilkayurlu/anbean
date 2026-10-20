import Link from "next/link";
import PageShell from "@/components/PageShell";
import { CLASSIFICATION_LABEL, POLICIES, POLICY_GROUPS } from "@/lib/policies";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: "Yasal belgeler — Anbean",
  description:
    "Gizlilik, sözleşme, operasyon ve izin belgeleri. Tümü taslak durumundadır ve hukuk danışmanı onayı beklemektedir.",
};

export default function YasalIndexPage() {
  const counts = POLICIES.reduce<Record<string, number>>((acc, policy) => {
    acc[policy.classification] = (acc[policy.classification] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <PageShell
      eyebrow="Yasal"
      title="Politika ve belgeler"
      lead="Bu belgelerin tamamı taslaktır. Hukuk danışmanı onayı gelene kadar yürürlükte değildir ve kesin sözleşme gibi sunulmaz."
    >
      <div className="rounded-lg border border-st-waiting/35 bg-st-waiting/8 p-5 text-sm text-slate-300">
        <p className="font-semibold text-white">Sınıflandırma özeti</p>
        <ul className="mt-2 space-y-1">
          {Object.entries(counts).map(([key, value]) => (
            <li key={key}>
              {CLASSIFICATION_LABEL[key as keyof typeof CLASSIFICATION_LABEL]}: <strong>{value}</strong> belge
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Hukukçu kararı bekleyen konular: elektronik para/bakiye modeli, IYS yükümlülüğü, sürücülü yolculuk kapsamı,
          iş ortağı sözleşmeleri. İletişim: {BRAND.support.privacyEmail}
        </p>
      </div>

      {POLICY_GROUPS.map((group) => {
        const items = POLICIES.filter((policy) => policy.group === group.key);
        if (items.length === 0) return null;
        return (
          <section key={group.key} className="mt-10">
            <h2 className="font-display text-xl font-semibold text-white">{group.label}</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {items.map((policy) => (
                <li key={policy.slug}>
                  <Link
                    href={`/yasal/${policy.slug}`}
                    className="block rounded-lg border border-white/10 bg-white/3 p-5 transition hover:border-accent/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-white">{policy.title}</p>
                      <span className="shrink-0 rounded-full border border-st-waiting/40 px-2.5 py-0.5 text-[10px] font-semibold text-st-waiting">
                        taslak v{policy.version}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{policy.summary}</p>
                    <p className="mt-3 text-[11px] text-slate-500">
                      {CLASSIFICATION_LABEL[policy.classification]} · sahip: {policy.owner} · güncelleme:{" "}
                      {policy.lastUpdated}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </PageShell>
  );
}

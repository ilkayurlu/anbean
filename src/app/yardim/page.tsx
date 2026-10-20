import Link from "next/link";
import PageShell from "@/components/PageShell";
import HelpSearch from "@/components/HelpSearch";
import { ALL_HELP_ARTICLES, HELP_CATEGORIES } from "@/lib/content";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: "Yardım Merkezi — Anbean",
  description: "Yemek, yolculuk, gönderi, ödeme, hesap ve güvenlik konularında aranabilir yardım.",
};

export default function YardimPage() {
  return (
    <PageShell
      eyebrow="Yardım"
      title="İşlem merkezli destek"
      lead="Sorunu hizmete göre değil, işleme göre çözüyoruz: talebini siparişine, sürüşüne veya gönderine bağlayabilirsin."
    >
      <HelpSearch articles={ALL_HELP_ARTICLES} />

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {HELP_CATEGORIES.map((category) => (
          <div key={category.key} className="rounded-lg border border-white/10 bg-white/3 p-5">
            <h2 className="font-display text-base font-semibold text-white">{category.label}</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-400">
              {category.articles.map((article) => (
                <li key={article.slug}>{article.question}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-lg border border-white/10 bg-white/3 p-6">
        <h2 className="font-display text-lg font-semibold text-white">İnsanla görüş</h2>
        <p className="mt-2 text-sm text-slate-400">
          {BRAND.support.phone} · {BRAND.support.phoneHours} · {BRAND.support.email}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/app/destek" className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-[#0B1220]">
            Destek talebi aç
          </Link>
          <Link href="/iletisim" className="rounded-md border border-white/15 px-5 py-2.5 text-sm text-slate-200">
            İletişim bilgileri
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

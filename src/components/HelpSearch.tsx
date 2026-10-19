"use client";

import { useMemo, useState } from "react";
import type { HelpArticle } from "@/lib/content";

type Article = HelpArticle & { category: string; categoryLabel: string };

/** Aranabilir yardım merkezi. Sunucudan gelen makaleler istemcide filtrelenir. */
export default function HelpSearch({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("hepsi");

  const categories = useMemo(
    () => Array.from(new Map(articles.map((a) => [a.category, a.categoryLabel])).entries()),
    [articles],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return articles.filter((article) => {
      if (category !== "hepsi" && article.category !== category) return false;
      if (!q) return true;
      return (
        article.question.toLocaleLowerCase("tr-TR").includes(q) ||
        article.answer.toLocaleLowerCase("tr-TR").includes(q)
      );
    });
  }, [articles, query, category]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Soru ara: ücret, iade, konum…"
          aria-label="Yardım ara"
          className="input-dark flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <FilterChip label="Hepsi" active={category === "hepsi"} onClick={() => setCategory("hepsi")} />
          {categories.map(([key, label]) => (
            <FilterChip key={key} label={label} active={category === key} onClick={() => setCategory(key)} />
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-500" role="status">
        {filtered.length} sonuç
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {filtered.map((article) => (
          <details key={`${article.category}-${article.slug}`} className="group rounded-lg border border-white/10 bg-white/3 p-5">
            <summary className="cursor-pointer list-none font-semibold text-white">
              <span className="mr-2 text-accent">+</span>
              {article.question}
              <span className="ml-2 text-[11px] font-normal text-slate-500">{article.categoryLabel}</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{article.answer}</p>
          </details>
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-white/3 p-6 text-sm text-slate-400 md:col-span-2">
            Bu aramayla eşleşen makale yok. Destek talebi açabilirsin.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
        active ? "border-accent bg-accent/12 text-white" : "border-white/12 text-slate-400 hover:border-white/30"
      }`}
    >
      {label}
    </button>
  );
}

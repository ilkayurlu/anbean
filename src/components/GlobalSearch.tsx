"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

type SearchItem = { id: number; title: string; detail: string };
type SearchResponse = { groups: Record<string, SearchItem[]> };

const GROUP_LABELS: Record<string, string> = {
  shipments: "Gönderiler",
  orders: "Siparişler",
  couriers: "Kuryeler",
  users: "Üyeler",
  organizations: "İşletmeler",
  support: "Destek talepleri",
  cms: "İçerikler",
};

const GROUP_LINKS: Record<string, string> = {
  shipments: "/ops",
  orders: "/app/siparislerim",
  couriers: "/admin",
  users: "/admin",
  organizations: "/admin",
  support: "/admin/destek",
  cms: "/admin",
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || normalizedQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? "Arama şu anda kullanılamıyor.");
        setResults(body as SearchResponse);
      } catch (searchError) {
        if (!controller.signal.aborted) {
          setResults(null);
          setError(searchError instanceof Error ? searchError.message : "Arama şu anda kullanılamıyor.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults(null);
    setError("");
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Global arama (Ctrl+K)"
        aria-label="Global aramayı aç"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-white/15 px-2.5 text-slate-300 transition hover:border-white/35 hover:bg-white/8 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Search size={16} aria-hidden="true" />
        <span className="hidden text-xs sm:inline">Ara</span>
        <kbd className="hidden rounded border border-white/15 px-1 text-[10px] text-slate-400 lg:inline">Ctrl K</kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/65 px-4 pt-[12vh] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Global arama"
            className="w-full max-w-2xl overflow-hidden rounded-lg border border-white/15 bg-[#101a2a] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search size={18} className="shrink-0 text-accent" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Sipariş, kurye veya içerik ara..."
                aria-label="Arama sorgusu"
                className="h-14 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={close}
                aria-label="Aramayı kapat"
                className="rounded p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-3" aria-live="polite">
              {query.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">Aramak için en az 2 karakter yazın.</p>
              ) : loading ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">Aranıyor...</p>
              ) : error ? (
                <div className="px-3 py-8 text-center text-sm text-slate-300">
                  <p>{error}</p>
                  {error === "Yetkisiz" ? (
                    <Link href="/giris" onClick={close} className="mt-3 inline-block text-accent hover:text-white">
                      Giriş yap
                    </Link>
                  ) : null}
                </div>
              ) : results && Object.keys(results.groups).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(results.groups).map(([group, items]) => (
                    <section key={group} aria-label={GROUP_LABELS[group] ?? group}>
                      <h2 className="px-2 pb-1 text-[11px] font-semibold uppercase text-slate-500">
                        {GROUP_LABELS[group] ?? group}
                      </h2>
                      <ul>
                        {items.map((item) => (
                          <li key={`${group}-${item.id}`}>
                            <Link
                              href={GROUP_LINKS[group] ?? "/admin"}
                              onClick={close}
                              className="block rounded-md px-3 py-2.5 transition hover:bg-white/8 focus-visible:bg-white/8 focus-visible:outline-none"
                            >
                              <span className="block text-sm font-medium text-white">{item.title}</span>
                              <span className="mt-0.5 block text-xs text-slate-400">{item.detail}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : results ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">Eşleşen kayıt bulunamadı.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
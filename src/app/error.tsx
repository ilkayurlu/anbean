"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BrandMark } from "@/components/SiteChrome";
import { STATUS_COLOR } from "@/lib/status";

/**
 * Çalışma zamanı hataları. Kullanıcıya ayrıntı gösterilmez (yığın izi sızmaz);
 * ayrıntı yalnızca sunucu günlüğüne yazılır.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[anbean] sayfa hatasi", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-deep px-5 text-center">
      <div className="route-lines absolute inset-0" aria-hidden />
      <div className="relative">
        <div className="flex justify-center text-white">
          <BrandMark />
        </div>
        <p className="mt-10 font-display text-6xl font-bold" style={{ color: STATUS_COLOR.risk }}>
          500
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Bir şeyler takıldı</h1>
        <p className="mt-3 max-w-md text-slate-400">
          Bu ekranı beklemiyorduk. Hata kayda geçti; tekrar deneyebilirsin.
          {error.digest ? <span className="mt-2 block font-mono text-xs text-slate-600">kod: {error.digest}</span> : null}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft"
          >
            Tekrar dene
          </button>
          <Link
            href="/"
            className="rounded-md border border-white/15 px-5 py-3 text-sm text-slate-200 transition hover:border-white/35"
          >
            Ana sayfa
          </Link>
        </div>
      </div>
    </main>
  );
}

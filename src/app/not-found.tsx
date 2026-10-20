import Link from "next/link";
import { BrandMark } from "@/components/SiteChrome";
import { STATUS_COLOR } from "@/lib/status";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-deep px-5 text-center">
      <div className="route-lines absolute inset-0" />
      <svg className="absolute inset-0 h-full w-full opacity-50" viewBox="0 0 1200 600" aria-hidden>
        <path
          className="route-dash"
          d="M100 500 C 320 480, 380 260, 600 300 S 900 420, 1100 180"
          stroke={STATUS_COLOR.risk}
          strokeWidth="2"
          fill="none"
        />
      </svg>
      <div className="relative">
        <div className="flex justify-center text-white">
          <BrandMark />
        </div>
        <p className="mt-10 font-display text-6xl font-bold text-white">404</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Bu rota haritada yok</h1>
        <p className="mt-3 max-w-md text-slate-400">
          Aradığın sayfa taşınmış ya da takip kodu geçersiz olabilir. Kodu yeniden sorgulayabilirsin.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/takip"
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft"
          >
            Takip sayfasına git
          </Link>
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

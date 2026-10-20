import Link from "next/link";
import TrackForm from "@/components/TrackForm";
import { BrandMark } from "@/components/SiteChrome";
import { DEMO_TOKENS } from "@/lib/seed";

export const metadata = { title: "Takip — Anbean" };

export default function TakipPage() {
  return (
    <main className="flex min-h-screen flex-col bg-deep">
      <div className="route-lines absolute inset-0 opacity-70" />
      <header className="relative px-5 py-6">
        <Link href="/" className="text-white">
          <BrandMark size="sm" />
        </Link>
      </header>
      <div className="relative flex flex-1 items-center justify-center px-5 pb-24">
        <div className="w-full max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tek alan, tek iş</p>
          <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">Takip kodunu gir</h1>
          <p className="mt-4 text-slate-400">
            Kod SMS ve e-postadaki bağlantının sonunda yer alır. Takip sayfası adres ve telefon bilgisi göstermez.
          </p>
          <div className="mt-8 text-left">
            <TrackForm size="lg" autoFocus />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-slate-500">
            <span className="py-1">Örnek:</span>
            {Object.values(DEMO_TOKENS).map((token) => (
              <Link
                key={token}
                href={`/takip/${token}`}
                className="rounded-sm border border-white/12 bg-white/5 px-2.5 py-1 font-mono tracking-wider text-slate-300 transition hover:border-accent/50 hover:text-white"
              >
                {token}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

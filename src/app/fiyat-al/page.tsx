import PageShell from "@/components/PageShell";
import QuoteCalculator from "@/components/QuoteCalculator";
import Link from "next/link";

export const metadata = { title: "Fiyat Al — Anbean" };

export default function FiyatAlPage() {
  return (
    <PageShell
      eyebrow="Tek ekran, adım yok"
      title="Fiyatı anında gör, sonra gönderiyi oluştur"
      lead="Sürgüleri oynattıkça tutar canlı güncellenir. Çok adımlı sihirbaz yok; tek ekranda karar ver."
    >
      <QuoteCalculator />
      <div className="mt-10 flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/3 p-6">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">Bu fiyatla gönderi oluştur</h2>
          <p className="mt-1 text-sm text-slate-400">
            Müşteri paneline giriş yap, adresleri gir; takip kodu anında üretilir.
          </p>
        </div>
        <Link
          href="/giris"
          className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft"
        >
          Panele gir
        </Link>
      </div>
    </PageShell>
  );
}

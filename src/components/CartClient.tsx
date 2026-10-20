"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { clearCart, readCart, writeCart, type CartState } from "@/lib/cart";
import { STATE_COPY, ERROR_COPY } from "@/lib/content";

const DISTRICTS = ["Kadıköy", "Beşiktaş", "Şişli", "Üsküdar", "Bakırköy", "Maltepe", "Beylikdüzü", "Pendik"];
const TIP_PRESETS = [
  { kurus: 0, label: "Bahşiş yok" },
  { kurus: 1000, label: "₺10" },
  { kurus: 2000, label: "₺20" },
  { kurus: 5000, label: "₺50" },
];

type Issue = { code: string; message: string; menuItemId?: number; actualKurus?: number };
type Quote = {
  restaurant: { name: string; isOpen: boolean; isDemo: boolean; note: string; prepMinutes: number; minBasketKurus: number };
  lines: { menuItemId: number; name: string; unitPriceKurus: number; quantity: number; lineTotalKurus: number }[];
  totals: Record<string, number>;
  coupon: { code: string; label: string } | null;
  issues: Issue[];
  canCheckout: boolean;
  breakdown: { label: string; kurus: number; sign: "plus" | "minus" }[];
};

function tl(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

export default function CartClient({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const [cart, setCart] = useState<CartState | null>(null);
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [coupon, setCoupon] = useState("");
  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"bakiye" | "fatura">("bakiye");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [acknowledged, setAcknowledged] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{ code: string; token: string; totalKurus: number } | null>(null);

  // Sepet depodan okunur; başka sekmede değişirse dinlenir (kurtarma davranışı).
  useEffect(() => {
    const load = () => setCart(readCart());
    load();
    window.addEventListener("anbean:cart", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("anbean:cart", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const payload = useCallback(
    () => ({
      restaurantSlug: cart?.restaurantSlug ?? "",
      district,
      lines: cart?.lines ?? [],
      couponCode: coupon || undefined,
      tipKurus: tip,
      acknowledgedPrices: acknowledged,
    }),
    [cart, district, coupon, tip, acknowledged],
  );

  useEffect(() => {
    // Boş sepette istek atılmaz; boş durum zaten quote'tan önce çizilir.
    // (setQuote(null) efekt gövdesinde senkron çağrılırsa kaskad render olur;
    //  sepet boşaltma aksiyonlarında durum açıkça sıfırlanıyor.)
    if (!cart || cart.lines.length === 0) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const res = await fetch("/api/orders/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      if (cancelled) return;
      if (res.ok) setQuote((await res.json()) as Quote);
      else setQuote(null);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [payload, cart]);

  async function checkout() {
    if (!quote?.canCheckout) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload(),
        addressText: address,
        note,
        paymentMethod,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      token?: string;
      totalKurus?: number;
      error?: string;
      issues?: Issue[];
    };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? (res.status === 401 ? ERROR_COPY.unauthorized : ERROR_COPY.server));
      if (data.issues?.some((issue) => issue.code === "price_changed")) setQuote((q) => q && { ...q, canCheckout: false });
      return;
    }
    setPlaced({ code: data.code ?? "", token: data.token ?? "", totalKurus: data.totalKurus ?? 0 });
    clearCart();
    setCart(null);
    router.refresh();
  }

  if (placed) {
    return (
      <div className="rounded-lg border border-st-delivered/40 bg-st-delivered/10 p-8 text-center">
        <p className="text-sm text-slate-300">Siparişin alındı</p>
        <p className="mt-2 font-display text-3xl font-bold text-white">{placed.code}</p>
        <p className="mt-2 text-sm text-slate-300">Toplam {tl(placed.totalKurus)}</p>
        <p className="mt-4 text-sm text-slate-400">
          Yemek teslimatı da kurye gönderisiyle aynı altyapıyı kullanır: durum şeridi ve takip ortaktır.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href={`/takip/${placed.token}`} className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220]">
            Siparişimi takip et
          </Link>
          <Link href="/app/siparislerim" className="rounded-md border border-white/15 px-5 py-3 text-sm text-slate-200">
            Siparişlerim
          </Link>
        </div>
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/3 p-10 text-center">
        <h2 className="font-display text-xl font-semibold text-white">{STATE_COPY.emptyCart.title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{STATE_COPY.emptyCart.body}</p>
        <Link href="/yemek" className="mt-6 inline-block rounded-md bg-accent px-6 py-3 text-sm font-semibold text-[#0B1220]">
          İşletmelere göz at
        </Link>
      </div>
    );
  }

  const priceIssues = (quote?.issues ?? []).filter((issue) => issue.code === "price_changed");
  const blocking = (quote?.issues ?? []).filter((issue) => issue.code !== "price_changed");

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-5">
        <section className="rounded-lg border border-white/10 bg-white/3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
            {quote?.restaurant.name ?? "Sepet"}
          </h2>
          {quote?.restaurant.isDemo ? (
            <p className="mt-2 rounded-md border border-st-waiting/35 bg-st-waiting/8 p-3 text-xs text-slate-300">
              {STATE_COPY.demoCatalog.body}
            </p>
          ) : null}
          <ul className="mt-4 divide-y divide-white/8">
            {(quote?.lines ?? []).map((line) => (
              <li key={line.menuItemId} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm text-slate-100">{line.name}</p>
                  <p className="text-xs text-slate-500">
                    {line.quantity} × {tl(line.unitPriceKurus)}
                  </p>
                </div>
                <span className="font-display text-sm font-bold text-white tabular-nums">{tl(line.lineTotalKurus)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/yemek/${cart.restaurantSlug}`} className="rounded-md border border-white/15 px-4 py-2 text-xs text-slate-300">
              Menüye dön
            </Link>
            <button
              type="button"
              onClick={() => {
                clearCart();
                setCart(null);
                setQuote(null);
              }}
              className="rounded-md border border-st-risk/40 px-4 py-2 text-xs text-st-risk"
            >
              Sepeti boşalt
            </button>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/3 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Teslimat</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="cart-district" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                İlçe
              </label>
              <select id="cart-district" value={district} onChange={(e) => setDistrict(e.target.value)} className="input-dark mt-2">
                {DISTRICTS.map((name) => (
                  <option key={name} value={name} className="bg-[#0b1220]">
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cart-coupon" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                Kupon
              </label>
              <input
                id="cart-coupon"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                className="input-dark mt-2 font-mono"
                placeholder="ILKSIPARIS"
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="cart-address" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
              Teslimat adresi
            </label>
            <textarea
              id="cart-address"
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-dark mt-2"
              placeholder="Mahalle, sokak, bina ve daire"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="cart-note" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
              Teslimat notu (opsiyonel)
            </label>
            <input id="cart-note" value={note} onChange={(e) => setNote(e.target.value)} className="input-dark mt-2" />
          </div>
          <fieldset className="mt-5">
            <legend className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Bahşiş (varsayılan kapalı)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIP_PRESETS.map((preset) => (
                <button
                  key={preset.kurus}
                  type="button"
                  aria-pressed={tip === preset.kurus}
                  onClick={() => setTip(preset.kurus)}
                  className={`min-h-11 rounded-md border px-4 text-sm transition ${
                    tip === preset.kurus
                      ? "border-accent bg-accent/12 font-semibold text-white"
                      : "border-white/12 text-slate-400"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-lg border border-accent/25 bg-accent/6 p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Ücret dökümü</p>
          <ul className="mt-4 space-y-2 text-sm">
            {(quote?.breakdown ?? []).map((row) => (
              <li key={row.label} className="flex justify-between text-slate-300">
                <span>{row.label}</span>
                <span className="tabular-nums">
                  {row.sign === "minus" ? "−" : ""}
                  {tl(row.kurus)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t border-white/10 pt-4 font-display text-xl font-bold text-white">
            <span>Toplam</span>
            <span className="tabular-nums">{quote ? tl(quote.totals.totalKurus) : "—"}</span>
          </p>
          <p className="mt-2 text-[11px] text-slate-500">KDV dahildir. Tahmini hazırlık ~{quote?.restaurant.prepMinutes ?? 0} dk.</p>

          {blocking.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {blocking.map((issue, index) => (
                <li key={`${issue.code}-${index}`} className="rounded-md border border-st-risk/35 bg-st-risk/8 p-3 text-xs text-slate-200">
                  {issue.message}
                </li>
              ))}
            </ul>
          ) : null}

          {priceIssues.length > 0 ? (
            <div className="mt-4 rounded-md border border-st-waiting/40 bg-st-waiting/10 p-3">
              <p className="text-xs font-semibold text-white">{STATE_COPY.priceChanged.title}</p>
              <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                {priceIssues.map((issue) => (
                  <li key={issue.menuItemId}>{issue.message}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  const next = { ...acknowledged };
                  for (const issue of priceIssues) {
                    if (issue.menuItemId && typeof issue.actualKurus === "number") {
                      next[String(issue.menuItemId)] = issue.actualKurus;
                    }
                  }
                  setAcknowledged(next);
                }}
                className="mt-3 w-full rounded-md bg-st-waiting px-4 py-2.5 text-xs font-semibold text-[#0B1220]"
              >
                Yeni fiyatları kabul ediyorum
              </button>
            </div>
          ) : null}

          <fieldset className="mt-5">
            <legend className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Ödeme</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["bakiye", "fatura"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  aria-pressed={paymentMethod === method}
                  onClick={() => setPaymentMethod(method)}
                  className={`min-h-11 rounded-md border px-3 text-xs font-semibold transition ${
                    paymentMethod === method ? "border-accent bg-accent/12 text-white" : "border-white/12 text-slate-400"
                  }`}
                >
                  {method === "bakiye" ? "Platform bakiyesi" : "Kurumsal fatura"}
                </button>
              ))}
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="mt-3 text-xs text-st-risk">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={checkout}
            disabled={busy || !quote?.canCheckout || address.trim().length < 10 || !loggedIn}
            className="mt-4 w-full rounded-md bg-accent px-5 py-3.5 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-50"
          >
            {!loggedIn ? "Sipariş için giriş yap" : busy ? "Sipariş veriliyor…" : `Siparişi onayla ve öde · ${quote ? tl(quote.totals.totalKurus) : "—"}`}
          </button>
          <p className="mt-2 text-[11px] text-slate-500">
            Bu düğme ödeme doğurur. Onayladığın tutar {quote ? tl(quote.totals.totalKurus) : "—"} ve sunucuda yeniden hesaplanır.
          </p>
          {!loggedIn ? (
            <Link href="/giris" className="mt-2 inline-block text-xs font-semibold text-accent underline-offset-4 hover:underline">
              Giriş yap
            </Link>
          ) : null}
          {address.trim().length > 0 && address.trim().length < 10 ? (
            <p className="mt-2 text-[11px] text-st-waiting">Adres en az 10 karakter olmalı.</p>
          ) : null}
        </div>

        <p className="text-[11px] text-slate-500">
          Ödeme sağlayıcısı bağlı değil: &quot;platform bakiyesi&quot; demo bakiyedir, elektronik para değildir. Sipariş
          öncesi ön bilgilendirme ve mesafeli satış metinleri taslak aşamasındadır.
        </p>
      </aside>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const AMOUNTS = [10_000, 25_000, 50_000];

function tl(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

export default function TopUpForm() {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function topUp(amountKurus: number) {
    setBusy(amountKurus);
    setMessage(null);
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKurus }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!res.ok) {
      setMessage({ ok: false, text: data.error ?? "Yükleme başarısız." });
      return;
    }
    setMessage({ ok: true, text: `${tl(amountKurus)} yüklendi.` });
    router.refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            disabled={busy !== null}
            onClick={() => topUp(amount)}
            className="h-14 rounded-md border border-slate-200 bg-white text-sm font-semibold text-[#0B1220] transition hover:border-accent disabled:opacity-60"
          >
            {busy === amount ? "…" : tl(amount)}
          </button>
        ))}
      </div>
      {message ? (
        <p role="status" className={`mt-3 text-sm ${message.ok ? "text-green-700" : "text-st-risk"}`}>
          {message.text}
        </p>
      ) : null}
      <p className="mt-4 text-xs text-slate-500">
        Demo: gerçek ödeme sağlayıcısı bağlı değil. Yükleme, platform cüzdanından çift taraflı kayıtla simüle edilir.
      </p>
    </div>
  );
}

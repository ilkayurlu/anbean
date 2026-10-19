"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function tl(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

/** Kurye hakediş çıkış talebi — IBAN'ın yalnızca maskesi saklanır. */
export function PayoutRequestForm({ balanceKurus }: { balanceKurus: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const amountKurus = Math.round((Number(amount) || 0) * 100);
  const ibanDigits = iban.replace(/\s/g, "");
  const valid = amountKurus >= 10_000 && amountKurus <= balanceKurus && /^TR\d{24}$/.test(ibanDigits);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKurus, iban: ibanDigits }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Talep oluşturulamadı.");
      return;
    }
    setAmount("");
    setIban("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Para çekme talebi</h2>
      <p className="mt-2 text-sm text-slate-600">
        Kullanılabilir hakediş: <strong className="text-[#0B1220]">{tl(balanceKurus)}</strong> · en az 100 TL
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="payout-amount" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Tutar (TL)
          </label>
          <input
            id="payout-amount"
            type="number"
            min={100}
            step={10}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-light mt-2"
            required
          />
        </div>
        <div>
          <label htmlFor="payout-iban" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            IBAN
          </label>
          <input
            id="payout-iban"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            className="input-light mt-2 font-mono"
            placeholder="TR00 0000 0000 0000 0000 0000 00"
            required
          />
        </div>
      </div>
      {amountKurus > balanceKurus && amountKurus > 0 ? (
        <p className="mt-2 text-xs text-st-risk">Tutar bakiyeden yüksek.</p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-st-risk">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !valid}
        className="mt-4 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-50"
      >
        {busy ? "Gönderiliyor…" : "Talep oluştur"}
      </button>
      <p className="mt-3 text-[11px] text-slate-500">
        IBAN&apos;ın yalnızca maskesi saklanır. Talebi finans onaylar; onaylayan kişi talebi açan olamaz.
      </p>
    </form>
  );
}

/** Finans maker-checker kararları. */
export function PayoutDecide({
  requestId,
  status,
  requestedByMe,
}: {
  requestId: number;
  status: string;
  requestedByMe: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function decide(action: "onayla" | "reddet" | "ode") {
    setBusy(action);
    setError("");
    const res = await fetch(`/api/payout/${requestId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy("");
    if (!res.ok) {
      setError(data.error ?? "İşlem yapılamadı.");
      return;
    }
    router.refresh();
  }

  const buttons: { action: "onayla" | "reddet" | "ode"; label: string; tone: string }[] =
    status === "beklemede"
      ? [
          { action: "onayla", label: "Onayla", tone: "border-st-delivered/50 text-green-700 hover:bg-st-delivered/10" },
          { action: "reddet", label: "Reddet", tone: "border-st-risk/50 text-st-risk hover:bg-st-risk/10" },
        ]
      : status === "onaylandi"
        ? [{ action: "ode", label: "Ödemeyi yap", tone: "border-accent text-[#0B1220] hover:bg-accent/15" }]
        : [];

  return (
    <div>
      {requestedByMe ? (
        <p className="text-[11px] text-st-risk">Bu talebi sen açtın — maker-checker gereği karar veremezsin.</p>
      ) : buttons.length === 0 ? (
        <p className="text-[11px] text-slate-500">Bu talep için bekleyen işlem yok.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {buttons.map((button) => (
            <button
              key={button.action}
              type="button"
              disabled={busy !== ""}
              onClick={() => decide(button.action)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${button.tone}`}
            >
              {busy === button.action ? "…" : button.label}
            </button>
          ))}
        </div>
      )}
      {error ? <p className="mt-1.5 text-[11px] text-st-risk">{error}</p> : null}
    </div>
  );
}

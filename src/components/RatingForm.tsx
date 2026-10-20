"use client";

import { useState } from "react";

export default function RatingForm({
  shipmentId,
  courierName,
  alreadyRated,
}: {
  shipmentId: number;
  courierName: string;
  alreadyRated: boolean;
}) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(alreadyRated);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (done) {
    return <p className="text-sm text-slate-400">Değerlendirmen kaydedildi. Teşekkürler.</p>;
  }

  async function submit() {
    if (score === 0) {
      setError("Önce puan seç.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipmentId, score, comment }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setError(data.error ?? "Puan kaydedilemedi.");
  }

  return (
    <div>
      <p className="text-sm text-slate-700">
        {courierName} teslimatını nasıl buldun?
      </p>
      <div className="mt-3 flex gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setScore(value)}
            aria-label={`${value} puan`}
            className={`h-11 w-11 rounded-md border text-sm font-semibold transition ${
              score >= value
                ? "border-accent bg-accent text-[#0B1220]"
                : "border-slate-300 bg-white text-slate-500 hover:border-slate-500"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="İsteğe bağlı yorum"
        className="input-light mt-3"
      />
      {error ? <p className="mt-2 text-sm text-st-risk">{error}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-3 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60"
      >
        {busy ? "Gönderiliyor…" : "Değerlendir"}
      </button>
    </div>
  );
}

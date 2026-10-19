"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useNow } from "@/lib/useNow";

const ACTIONS = [
  { key: "yeniden_planla", label: "Yeniden planla" },
  { key: "iade_baslat", label: "İade başlat" },
  { key: "incelemeye_al", label: "İncelemeye al" },
];

export default function ResolutionControl({
  shipmentId,
  deadlineIso,
}: {
  shipmentId: number;
  deadlineIso: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [grantCredit, setGrantCredit] = useState(true);
  const [error, setError] = useState("");
  const now = useNow(deadlineIso !== null);

  const left = deadlineIso && now !== null ? Math.round((new Date(deadlineIso).getTime() - now) / 1000) : null;

  async function run(action: string) {
    setBusy(action);
    setError("");
    const res = await fetch("/api/ops/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipmentId, action, grantCredit }),
    });
    setBusy("");
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Çözüm uygulanamadı.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-md bg-slate-50 p-3">
      {left !== null ? (
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.1em] tabular-nums"
          style={{ color: left > 0 ? "#B45309" : "#DC2626" }}
        >
          {left > 0
            ? `Çözüm süresi: ${Math.floor(left / 60)}:${String(Math.abs(left % 60)).padStart(2, "0")}`
            : "Çözüm taahhüdü aşıldı"}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={busy !== ""}
            onClick={() => run(action.key)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 disabled:opacity-60"
          >
            {busy === action.key ? "…" : action.label}
          </button>
        ))}
      </div>

      <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
        <input
          type="checkbox"
          checked={grantCredit}
          onChange={(e) => setGrantCredit(e.target.checked)}
          className="accent-accent"
        />
        Jest kredisi uygula (%50 teslimat ücreti)
      </label>
      {error ? <p className="mt-1.5 text-[11px] text-st-risk">{error}</p> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const NEXT_ACTIONS: Record<string, { to: string; label: string; tone: "go" | "warn" | "risk" }[]> = {
  kurye_atandi: [{ to: "alima_gidiyor", label: "Alıma gidiyorum", tone: "go" }],
  alima_gidiyor: [{ to: "gonderi_alindi", label: "Gönderiyi aldım", tone: "go" }],
  gonderi_alindi: [
    { to: "dagitima_cikti", label: "Dağıtıma çıktım", tone: "go" },
    { to: "aktarma_merkezinde", label: "Aktarmaya bıraktım", tone: "warn" },
  ],
  aktarma_merkezinde: [{ to: "dagitima_cikti", label: "Dağıtıma çıktım", tone: "go" }],
  dagitima_cikti: [
    { to: "teslim_edildi", label: "Teslim ettim", tone: "go" },
    { to: "teslimat_denemesi_basarisiz", label: "Teslim edemedim", tone: "risk" },
  ],
  teslimat_denemesi_basarisiz: [{ to: "yeniden_planlandi", label: "Yeniden planla", tone: "warn" }],
  yeniden_planlandi: [{ to: "dagitima_cikti", label: "Tekrar dağıtıma çıktım", tone: "go" }],
};

const TONE = {
  go: "bg-st-delivered text-white",
  warn: "bg-st-waiting text-[#0B1220]",
  risk: "border border-st-risk/60 text-st-risk",
};

export default function CourierTaskActions({ shipmentId, status }: { shipmentId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const actions = NEXT_ACTIONS[status] ?? [];

  if (actions.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">Bu görevde yapılacak işlem kalmadı.</p>;
  }

  async function run(to: string) {
    setBusy(to);
    setError("");
    const res = await fetch(`/api/shipments/${shipmentId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to }),
    });
    setBusy("");
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "İşlem başarısız.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4">
      <div className="grid gap-2">
        {actions.map((action) => (
          <button
            key={action.to}
            type="button"
            disabled={busy !== ""}
            onClick={() => run(action.to)}
            className={`flex h-14 items-center justify-center rounded-md text-base font-semibold transition disabled:opacity-60 ${TONE[action.tone]}`}
          >
            {busy === action.to ? "Gönderiliyor…" : action.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-st-risk">{error}</p> : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FieldTask } from "@/db/schema";
import { STATUS_COLOR } from "@/lib/status";

function formatTry(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

const KIND_LABEL: Record<string, string> = {
  batarya_degisimi: "Batarya değişimi",
  ariza_toplama: "Arızalı araç toplama",
  arac_yeniden_konumlandirma: "Araç yeniden konumlandırma",
  kontrol: "Kontrol",
};

const PRIORITY_COLOR: Record<string, string> = {
  acil: STATUS_COLOR.risk,
  normal: STATUS_COLOR.waiting,
  planli: STATUS_COLOR.neutral,
};

export default function FieldTaskCard({ task }: { task: FieldTask }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function claim() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/field-tasks/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Görev alınamadı.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-sm font-bold text-[#0B1220]">{task.code}</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: PRIORITY_COLOR[task.priority],
            backgroundColor: `${PRIORITY_COLOR[task.priority]}1f`,
          }}
        >
          {task.priority}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-800">{KIND_LABEL[task.kind] ?? task.kind}</p>
      <p className="mt-1 text-xs text-slate-500">{task.district}</p>
      {task.notes ? <p className="mt-2 text-xs text-slate-600">{task.notes}</p> : null}
      <p className="mt-3 font-display text-base font-bold" style={{ color: STATUS_COLOR.delivered }}>
        +{formatTry(task.rewardKurus)}
      </p>
      {error ? <p className="mt-1 text-xs text-st-risk">{error}</p> : null}
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="mt-3 w-full rounded-md border border-sur bg-sur/10 px-3 py-2 text-xs font-semibold text-sur-ink transition hover:bg-sur/20 disabled:opacity-60"
      >
        {busy ? "Alınıyor…" : "Görevi sahiplen"}
      </button>
    </div>
  );
}

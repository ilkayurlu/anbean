"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AssignControl({
  shipmentId,
  couriers,
}: {
  shipmentId: number;
  couriers: { id: number; fullName: string; activeLoad: number; vehicle: string }[];
}) {
  const router = useRouter();
  const [courierId, setCourierId] = useState(couriers[0]?.id ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (couriers.length === 0) {
    return <p className="text-xs text-st-risk">Aktif kurye yok.</p>;
  }

  async function assign() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/ops/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shipmentId, courierId }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Atama yapılamadı.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={courierId}
        onChange={(e) => setCourierId(Number(e.target.value))}
        className="input-light max-w-52 py-2 text-sm"
      >
        {couriers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.fullName} · {c.vehicle} ({c.activeLoad})
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={assign}
        disabled={busy}
        className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60"
      >
        {busy ? "Atanıyor…" : "Ata"}
      </button>
      {error ? <span className="text-xs text-st-risk">{error}</span> : null}
    </div>
  );
}

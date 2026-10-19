"use client";

import { useEffect, useState } from "react";
import StatusStrip, { StatusPill } from "./StatusStrip";
import { STATUS, type StatusKey } from "@/lib/status";

const CYCLE: StatusKey[] = [
  "alim_planlandi",
  "kurye_atandi",
  "gonderi_alindi",
  "aktarma_merkezinde",
  "dagitima_cikti",
  "teslim_edildi",
];

export default function LiveStripDemo() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % CYCLE.length), 2200);
    return () => clearInterval(timer);
  }, []);

  const status = CYCLE[index];

  return (
    <div className="rounded-lg border border-white/10 bg-white/4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Canlı örnek</p>
          <p className="font-display text-sm font-semibold text-white">AB-2026-001042</p>
        </div>
        <StatusPill status={status} dark />
      </div>
      <StatusStrip status={status} size="lg" showLabels animated className="mt-5" />
      <p className="mt-4 text-sm text-slate-400">{STATUS[status].publicNote}</p>
    </div>
  );
}

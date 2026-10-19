"use client";

import { useNow } from "@/lib/useNow";

export default function EtaCounter({ etaIso, done }: { etaIso: string | null; done: boolean }) {
  // Sunucu ve istemci saati farklı: sayaç yalnızca istemcide çizilir.
  // useSyncExternalStore tabanlı useNow → hidrasyon uyuşmazlığı yok.
  const now = useNow(!done && etaIso !== null);

  if (done) {
    return <span className="font-display text-3xl font-bold text-st-delivered">Teslim edildi</span>;
  }
  if (!etaIso) {
    return <span className="font-display text-3xl font-bold text-slate-400">Planlanıyor</span>;
  }

  if (now === null) {
    return <span className="font-display text-3xl font-bold tabular-nums text-slate-500">--:--</span>;
  }
  const diff = new Date(etaIso).getTime() - now;
  if (diff <= 0) {
    return <span className="font-display text-3xl font-bold text-st-waiting">Teslim penceresinde</span>;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <span className="font-display text-3xl font-bold tabular-nums text-white">
      {hours > 0 ? `${hours}s ` : ""}
      {String(minutes).padStart(2, "0")}dk {String(seconds).padStart(2, "0")}sn
    </span>
  );
}

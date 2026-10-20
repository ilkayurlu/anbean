"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";

const TERMINAL = new Set(["teslim_edildi", "iade_edildi", "iptal", "arsivlendi"]);
const BASE_DELAY = 15_000;

/**
 * Sayfa yenilemeden canlı durum. Harici realtime servisi yok (Supabase değil,
 * yerel Postgres): 15 sn'de bir takip API'si yoklanır; durum ya da olay sayısı
 * değiştiyse sunucu bileşeni router.refresh() ile tazelenir. Sekme gizliyken
 * yoklama durur; hata olursa bekleme 15→30→60 sn'ye çıkar; bağlantı dönünce
 * hemen yeniden denenir. Saniye sayacı aria-live dışında: ekran okuyucu her
 * saniye konuşmaz, yalnızca durum değişince duyurur.
 */
export default function LiveStatus({
  token,
  status,
  eventCount,
}: {
  token: string;
  status: string;
  eventCount: number;
}) {
  const router = useRouter();
  const terminal = TERMINAL.has(status);
  const [state, setState] = useState<"live" | "reconnecting">("live");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    setNow(start);
    setLastSync(start);
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (terminal) return;
    let delay = BASE_DELAY;
    let timer: number | undefined;
    let cancelled = false;

    const poll = async () => {
      if (document.visibilityState !== "hidden") {
        try {
          const res = await fetch(`/api/track/${encodeURIComponent(token)}`, { cache: "no-store" });
          if (!res.ok) throw new Error(String(res.status));
          const data = (await res.json()) as { status?: string; events?: unknown[] };
          if (cancelled) return;
          setState("live");
          setLastSync(Date.now());
          delay = BASE_DELAY;
          if (data.status !== status || (data.events?.length ?? 0) !== eventCount) router.refresh();
        } catch {
          if (cancelled) return;
          setState("reconnecting");
          delay = Math.min(delay * 2, 60_000);
        }
      }
      if (!cancelled) timer = window.setTimeout(poll, delay);
    };

    const onOnline = () => {
      window.clearTimeout(timer);
      delay = BASE_DELAY;
      void poll();
    };
    const onOffline = () => setState("reconnecting");

    timer = window.setTimeout(poll, delay);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [terminal, token, status, eventCount, router]);

  const ago = now !== null && lastSync !== null ? Math.max(0, Math.round((now - lastSync) / 1000)) : null;
  const label = terminal ? "Tamamlandı" : state === "live" ? "Canlı" : "Bağlantı koptu, yeniden deneniyor";

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-slate-300">
      {terminal ? (
        <span className="h-2 w-2 rounded-full bg-st-delivered" aria-hidden />
      ) : state === "live" ? (
        <span className="live-dot" aria-hidden />
      ) : (
        <WifiOff size={12} aria-hidden className="text-st-waiting" />
      )}
      <span role="status">{label}</span>
      {!terminal && state === "live" && ago !== null ? (
        <span className="tabular-nums text-slate-500">· {ago} sn önce</span>
      ) : null}
    </span>
  );
}

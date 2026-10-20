"use client";

import Link from "next/link";
import { useState } from "react";
import { useNow } from "@/lib/useNow";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, Zap } from "lucide-react";
import type { FieldTask, GeoFence, IotVehicle } from "@/db/schema";
import { STATUS_COLOR } from "@/lib/status";

export type ActiveRide = {
  id: number;
  code: string;
  vehicleCode: string;
  startedAt: string;
  perMinuteKurus: number;
};

type Pt = { x: number; y: number };

const MAP_W = 720;
const MAP_H = 460;
const PAD = 56;

const KIND_LABEL: Record<string, string> = {
  scooter: "Scooter",
  ebike: "E-bisiklet",
  moped: "Moped",
  cargo_bike: "Kargo bisikleti",
};

const STATUS_TEXT: Record<string, string> = {
  available: "müsait",
  in_use: "kullanımda",
  low_battery: "batarya düşük",
  maintenance: "bakımda",
  reserved: "rezerve",
  disabled: "devre dışı",
};

function tl(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Tüm noktaları çerçeveye sığdıran projeksiyon. Önceki sürüm sabit ölçek
 * kullanıyordu ve araçların çoğu çerçevenin dışına düşüyordu.
 */
function makeProjection(points: { lat: number; lng: number }[]): (lat: number, lng: number) => Pt {
  if (points.length === 0) return () => ({ x: MAP_W / 2, y: MAP_H / 2 });
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const cos = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = Math.max((maxLng - minLng) * cos, 0.004);
  const spanY = Math.max(maxLat - minLat, 0.004);
  const k = Math.min((MAP_W - PAD * 2) / spanX, (MAP_H - PAD * 2) / spanY);
  const offX = (MAP_W - spanX * k) / 2;
  const offY = (MAP_H - spanY * k) / 2;
  return (lat, lng) => ({ x: offX + (lng - minLng) * cos * k, y: offY + (maxLat - lat) * k });
}

function vehicleColor(v: IotVehicle) {
  if (v.status === "in_use") return STATUS_COLOR.transit;
  if (v.status === "maintenance") return STATUS_COLOR.risk;
  if (v.batteryPercent < 30) return STATUS_COLOR.waiting;
  return STATUS_COLOR.delivered;
}

export default function FleetMapClient({
  vehicles,
  fences,
  tasks,
  activeRide,
  loggedIn,
}: {
  vehicles: IotVehicle[];
  fences: GeoFence[];
  tasks: FieldTask[];
  activeRide: ActiveRide | null;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<IotVehicle | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const now = useNow(activeRide !== null);

  const project = makeProjection([
    ...vehicles
      .filter((v) => v.lastLat !== null && v.lastLng !== null)
      .map((v) => ({ lat: v.lastLat as number, lng: v.lastLng as number })),
    ...tasks.map((t) => ({ lat: t.lat, lng: t.lng })),
    ...fences.flatMap((f) => (f.polygon?.[0] ?? []).map(([lng, lat]) => ({ lat, lng }))),
  ]);

  const openTasksByVehicle = new Map<number, number>();
  for (const task of tasks) {
    if (task.vehicleId) openTasksByVehicle.set(task.vehicleId, (openTasksByVehicle.get(task.vehicleId) ?? 0) + 1);
  }

  const elapsed =
    activeRide && now !== null ? Math.max(0, Math.floor((now - new Date(activeRide.startedAt).getTime()) / 1000)) : null;
  const estimate = activeRide && elapsed !== null ? Math.max(1, Math.ceil(elapsed / 60)) * activeRide.perMinuteKurus : null;

  function select(vehicle: IotVehicle) {
    setSelected(vehicle);
    setError("");
  }

  async function rent(vehicle: IotVehicle) {
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fetch("/api/rides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleCode: vehicle.code, lat: vehicle.lastLat, lng: vehicle.lastLng }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; rideCode?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Kilit açılamadı.");
      return;
    }
    setSelected(null);
    setNotice(`${data.rideCode ?? "Sürüş"} başladı. Kilit açma isteği sunucuda doğrulandı.`);
    router.refresh();
  }

  async function endRide() {
    if (!activeRide) return;
    setBusy(true);
    setError("");
    setNotice("");
    const res = await fetch(`/api/rides?rideId=${activeRide.id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string; priceKurus?: number; durationSeconds?: number };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Sürüş bitirilemedi.");
      return;
    }
    const minutes = Math.max(1, Math.ceil((data.durationSeconds ?? 0) / 60));
    setNotice(`Sürüş bitti: ${minutes} dk · ${tl(data.priceKurus ?? 0)} cüzdandan düştü. Araç kilitlendi.`);
    router.refresh();
  }

  function renderAction(vehicle: IotVehicle) {
    if (!loggedIn) {
      return (
        <Link
          href="/giris"
          className="flex h-12 w-full items-center justify-center rounded-md border border-white/15 text-sm font-semibold text-slate-200 transition hover:border-white/35"
        >
          Kiralamak için giriş yap
        </Link>
      );
    }
    if (activeRide) {
      return (
        <p className="rounded-md border border-white/10 bg-white/3 p-3 text-xs text-slate-400">
          Önce aktif sürüşünü bitir.
        </p>
      );
    }
    if (vehicle.status === "available" && vehicle.batteryPercent >= 20) {
      return (
        <button
          type="button"
          onClick={() => rent(vehicle)}
          disabled={busy}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-base font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60"
        >
          <LockOpen size={18} aria-hidden /> {busy ? "Kilit açılıyor…" : "Kirala ve kilidi aç"}
        </button>
      );
    }
    return (
      <p className="rounded-md border border-white/10 bg-white/3 p-3 text-xs text-slate-400">
        Araç şu an kiralanamaz: <strong className="text-white">{STATUS_TEXT[vehicle.status] ?? vehicle.status}</strong>
      </p>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0a101c]">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="h-[460px] w-full" role="group" aria-label="Elektrikli filo haritası">
          <defs>
            <pattern id="fleet-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#fleet-grid)" />

          {fences.map((fence) => {
            const ring = fence.polygon?.[0];
            if (!ring || ring.length < 3) return null;
            const pts = ring.map(([lng, lat]) => project(lat, lng));
            const color = fence.kind === "no_park" ? STATUS_COLOR.risk : STATUS_COLOR.waiting;
            const minX = Math.min(...pts.map((p) => p.x));
            const minY = Math.min(...pts.map((p) => p.y));
            return (
              <g key={`f-${fence.id}`}>
                <polygon
                  points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill={color}
                  opacity="0.12"
                  stroke={color}
                  strokeWidth="1.5"
                />
                <text x={minX + 6} y={minY + 16} fill={color} fontSize="11" fontWeight="600">
                  {fence.name}
                  {fence.surgeMultiplier && fence.surgeMultiplier > 1 ? ` · ${fence.surgeMultiplier}x` : ""}
                </text>
              </g>
            );
          })}

          {vehicles.map((v) => {
            if (v.lastLat === null || v.lastLng === null) return null;
            const { x, y } = project(v.lastLat, v.lastLng);
            const color = vehicleColor(v);
            const isSelected = selected?.id === v.id;
            return (
              <g
                key={v.id}
                role="button"
                tabIndex={0}
                aria-label={`${v.code}, ${KIND_LABEL[v.kind] ?? v.kind}, batarya yüzde ${v.batteryPercent}, ${STATUS_TEXT[v.status] ?? v.status}`}
                onClick={() => select(v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    select(v);
                  }
                }}
                className="cursor-pointer"
              >
                <circle cx={x} cy={y} r={isSelected ? 20 : 14} fill={color} opacity="0.2" />
                <circle cx={x} cy={y} r={isSelected ? 8 : 6} fill={color} />
                {isSelected ? <circle cx={x} cy={y} r="24" fill="none" className="stroke-accent" strokeWidth="2" /> : null}
                <text x={x} y={y - 18} textAnchor="middle" fontSize="10" fill="#94a3b8">
                  {v.code}
                </text>
              </g>
            );
          })}

          {tasks.map((task) => {
            const { x, y } = project(task.lat, task.lng);
            const bx = x + 14;
            const by = y - 12;
            return (
              <g key={`t-${task.id}`} aria-hidden>
                <circle cx={bx} cy={by} r="9" fill="#0a101c" stroke={STATUS_COLOR.return} strokeWidth="1.5" />
                <Zap x={bx - 6} y={by - 6} size={12} color="#c4b5fd" strokeWidth={2.2} />
              </g>
            );
          })}
        </svg>
        <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5 text-[11px] text-slate-500">
          <span>Şematik görünüm · konumlar demo verisi</span>
          <span>
            {vehicles.length} araç · {fences.length} bölge
          </span>
        </div>
      </div>

      <aside className="space-y-4">
        {activeRide ? (
          <div className="rounded-lg border border-accent/40 bg-accent/10 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Aktif sürüş</p>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                <LockOpen size={14} aria-hidden /> kilit açık
              </span>
            </div>
            <p className="mt-2 font-display text-xl font-bold text-white">{activeRide.vehicleCode}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Süre</p>
                <p className="font-display text-2xl font-bold tabular-nums text-white">
                  {elapsed === null ? "--:--" : clock(elapsed)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Tahmini ücret</p>
                <p className="font-display text-2xl font-bold tabular-nums text-white">
                  {estimate === null ? "—" : tl(estimate)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400">Kesin tutar sürüş bitince sunucuda hesaplanır.</p>
            <button
              type="button"
              onClick={endRide}
              disabled={busy}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-base font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60"
            >
              <Lock size={18} aria-hidden /> {busy ? "Kilitleniyor…" : "Sürüşü bitir ve kilitle"}
            </button>
          </div>
        ) : null}

        {notice ? (
          <p role="status" className="rounded-md border border-st-delivered/40 bg-st-delivered/10 p-3 text-sm text-slate-200">
            {notice}
          </p>
        ) : null}

        <div className="rounded-lg border border-white/10 bg-white/3 p-5">
          {selected ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Seçili araç</p>
              <p className="mt-2 font-display text-xl font-bold text-white">{selected.code}</p>
              <p className="mt-1 text-sm text-slate-400">
                {KIND_LABEL[selected.kind] ?? selected.kind} · {selected.district}
              </p>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Batarya</dt>
                  <dd className="font-display text-lg font-bold text-white">%{selected.batteryPercent}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Menzil</dt>
                  <dd className="font-display text-lg font-bold text-white">{selected.rangeKm} km</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Dakika</dt>
                  <dd className="font-display text-lg font-bold text-white">{tl(selected.perMinuteKurus)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Durum</dt>
                  <dd className="font-display text-lg font-bold text-white">
                    {STATUS_TEXT[selected.status] ?? selected.status}
                  </dd>
                </div>
              </dl>
              {(openTasksByVehicle.get(selected.id) ?? 0) > 0 ? (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-violet-300">
                  <Zap size={12} aria-hidden /> Bu araç için {openTasksByVehicle.get(selected.id)} saha görevi açık.
                </p>
              ) : null}
              <div className="mt-5">{renderAction(selected)}</div>
            </div>
          ) : (
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Nasıl çalışır?</p>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-400">
                {[
                  "Haritada bir araca dokun ya da Tab ile seçip Enter'a bas.",
                  "Kirala isteği sunucuda doğrulanır; tarayıcı kilidi kendi başına açamaz.",
                  "Ücret dakika bazlı; sürüş bitince kurye gönderilerinle aynı cüzdandan düşer.",
                  "Kırmızı alan park yasağı, sarı alan yoğun saat bölgesi. Demoda konum simüle edildiği için bölge kuralları henüz sürüşe uygulanmıyor.",
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error ? <p className="mt-3 text-sm text-st-risk">{error}</p> : null}
        </div>
      </aside>
    </div>
  );
}

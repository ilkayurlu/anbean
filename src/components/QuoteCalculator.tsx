"use client";

import { useEffect, useMemo, useState } from "react";
import StatusStrip from "./StatusStrip";

type Quote = {
  tariffName: string;
  totalKurus: number;
  slaMinutes: number;
  breakdown: { label: string; kurus: number }[];
};

const TARIFFS = [
  { code: "sehir_ici", label: "Şehir İçi", hint: "5 saat" },
  { code: "ekspres", label: "Ekspres", hint: "90 dk" },
  { code: "kurumsal", label: "Kurumsal", hint: "Sözleşmeli" },
];

const DISTRICTS = ["Kadıköy", "Beşiktaş", "Şişli", "Üsküdar", "Bakırköy", "Maltepe", "Beylikdüzü", "Pendik"];

function tl(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

export default function QuoteCalculator() {
  const [tariffCode, setTariffCode] = useState("sehir_ici");
  const [distanceKm, setDistanceKm] = useState(9);
  const [weightKg, setWeightKg] = useState(2);
  const [dropDistrict, setDropDistrict] = useState("Kadıköy");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const payload = useMemo(
    () => ({ tariffCode, distanceKm, weightGrams: Math.round(weightKg * 1000), dropDistrict }),
    [tariffCode, distanceKm, weightKg, dropDistrict],
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!active) return;
      setLoading(false);
      if (res.ok) setQuote((await res.json()) as Quote);
    }, 220);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [payload]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border border-white/10 bg-white/3 p-6">
        <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Hizmet</label>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {TARIFFS.map((t) => (
            <button
              key={t.code}
              type="button"
              onClick={() => setTariffCode(t.code)}
              className={`rounded-md border px-3 py-3 text-left transition ${
                tariffCode === t.code
                  ? "border-accent bg-accent/12 text-white"
                  : "border-white/12 bg-white/3 text-slate-300 hover:border-white/25"
              }`}
            >
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className="block text-[11px] text-slate-500">{t.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Mesafe</label>
            <span className="font-display text-sm text-white">{distanceKm.toFixed(0)} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            value={distanceKm}
            onChange={(e) => setDistanceKm(Number(e.target.value))}
            className="mt-3 w-full accent-accent"
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Ağırlık</label>
            <span className="font-display text-sm text-white">{weightKg.toFixed(1)} kg</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={30}
            step={0.5}
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            className="mt-3 w-full accent-accent"
          />
        </div>

        <div className="mt-6">
          <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Teslim ilçesi</label>
          <select
            value={dropDistrict}
            onChange={(e) => setDropDistrict(e.target.value)}
            className="input-dark mt-3"
          >
            {DISTRICTS.map((d) => (
              <option key={d} value={d} className="bg-[#0b1220]">
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-accent/25 bg-accent/6 p-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Anlık fiyat</p>
        <p className="mt-2 font-display text-4xl font-bold text-white tabular-nums">
          {quote ? tl(quote.totalKurus) : "—"}
          {loading ? <span className="ml-2 align-middle text-xs text-slate-400">güncelleniyor…</span> : null}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {quote ? `${quote.tariffName} · SLA ${Math.round(quote.slaMinutes / 60)} saat` : "Hesaplanıyor"}
        </p>

        <StatusStrip status="gonderi_alindi" size="md" className="mt-6" />

        <ul className="mt-6 space-y-2 text-sm">
          {(quote?.breakdown ?? []).map((row) => (
            <li key={row.label} className="flex justify-between text-slate-300">
              <span>{row.label}</span>
              <span className="tabular-nums">{tl(row.kurus)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[11px] leading-relaxed text-slate-500">
          Tutar sunucuda hesaplanır; tarayıcıdan gönderilen fiyat kabul edilmez. KDV dahildir. Kapıda ödeme bu
          sürümde desteklenmez.
        </p>
      </div>
    </div>
  );
}

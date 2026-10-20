"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusStrip from "./StatusStrip";

const DISTRICTS = ["Kadıköy", "Beşiktaş", "Şişli", "Üsküdar", "Bakırköy", "Maltepe", "Beylikdüzü", "Pendik"];

function tl(kurus: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

export default function NewShipmentForm() {
  const [form, setForm] = useState({
    tariffCode: "sehir_ici",
    senderName: "",
    senderPhone: "",
    pickupDistrict: "Şişli",
    pickupAddress: "",
    recipientName: "",
    recipientPhone: "",
    dropDistrict: "Kadıköy",
    dropAddress: "",
    weightKg: 2,
    distanceKm: 9,
    notes: "",
    paymentMethod: "cuzdan",
  });
  const [preview, setPreview] = useState<number | null>(null);
  const [result, setResult] = useState<{ code: string; token: string; priceKurus: number } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tariffCode: form.tariffCode,
          distanceKm: form.distanceKm,
          weightGrams: Math.round(form.weightKg * 1000),
          dropDistrict: form.dropDistrict,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { totalKurus: number };
        setPreview(data.totalKurus);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [form.tariffCode, form.distanceKm, form.weightKg, form.dropDistrict]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        weightGrams: Math.round(form.weightKg * 1000),
        // Fiyat gönderilmez; sunucu hesaplar.
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      token?: string;
      priceKurus?: number;
      error?: string;
    };
    setBusy(false);
    if (res.ok && data.code && data.token) {
      setResult({ code: data.code, token: data.token, priceKurus: data.priceKurus ?? 0 });
    } else {
      setError(data.error ?? "Gönderi oluşturulamadı.");
    }
  }

  if (result) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">Gönderi oluşturuldu</p>
        <p className="mt-2 font-display text-3xl font-bold text-[#0B1220]">{result.code}</p>
        <StatusStrip status="kurye_atamasi_bekliyor" size="lg" className="mx-auto mt-6 max-w-md" />
        <p className="mt-6 text-sm text-slate-600">
          Takip kodu: <span className="font-mono tracking-wider text-[#0B1220]">{result.token}</span>
        </p>
        <p className="mt-1 text-sm text-slate-600">Tutar: {tl(result.priceKurus)}</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link
            href={`/takip/${result.token}`}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-[#0B1220]"
          >
            Takip sayfasını aç
          </Link>
          <Link href="/app" className="rounded-md border border-slate-300 px-5 py-2.5 text-sm text-slate-700">
            Listeye dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Alım</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Gönderici adı" value={form.senderName} onChange={(v) => set("senderName", v)} required />
            <Input label="Gönderici telefon" value={form.senderPhone} onChange={(v) => set("senderPhone", v)} required />
            <Select
              label="Alım ilçesi"
              value={form.pickupDistrict}
              onChange={(v) => set("pickupDistrict", v)}
              options={DISTRICTS}
            />
            <Input label="Alım adresi" value={form.pickupAddress} onChange={(v) => set("pickupAddress", v)} required />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Teslim</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Alıcı adı" value={form.recipientName} onChange={(v) => set("recipientName", v)} required />
            <Input
              label="Alıcı telefon"
              value={form.recipientPhone}
              onChange={(v) => set("recipientPhone", v)}
              required
            />
            <Select
              label="Teslim ilçesi"
              value={form.dropDistrict}
              onChange={(v) => set("dropDistrict", v)}
              options={DISTRICTS}
            />
            <Input label="Teslim adresi" value={form.dropAddress} onChange={(v) => set("dropAddress", v)} required />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Gönderi</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Select
              label="Tarife"
              value={form.tariffCode}
              onChange={(v) => set("tariffCode", v)}
              options={["sehir_ici", "ekspres", "kurumsal"]}
            />
            <Input
              label="Ağırlık (kg)"
              value={String(form.weightKg)}
              onChange={(v) => set("weightKg", Number(v) || 0.5)}
              type="number"
            />
            <Input
              label="Mesafe (km)"
              value={String(form.distanceKm)}
              onChange={(v) => set("distanceKm", Number(v) || 1)}
              type="number"
            />
          </div>
          <div className="mt-4">
            <label className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Not</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="input-light mt-2"
            />
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-lg border border-slate-200 bg-white p-5">
        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Sunucu fiyatı</p>
        <p className="mt-2 font-display text-3xl font-bold text-[#0B1220] tabular-nums">
          {preview === null ? "—" : tl(preview)}
        </p>
        <StatusStrip status="alim_planlandi" size="md" className="mt-5" />
        <fieldset className="mt-5">
          <legend className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Ödeme</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { value: "cuzdan", label: "Platform bakiyesi" },
              { value: "fatura", label: "Kurumsal fatura" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={form.paymentMethod === option.value}
                onClick={() => set("paymentMethod", option.value)}
                className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                  form.paymentMethod === option.value
                    ? "border-accent bg-accent/10 text-[#0B1220]"
                    : "border-slate-200 text-slate-600 hover:border-slate-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="mt-4 text-xs text-slate-500">
          Nihai tutar kaydetme anında sunucuda yeniden hesaplanır. Tarayıcıdan gelen fiyat yok sayılır.
        </p>
        {error ? <p className="mt-3 text-sm text-st-risk">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60"
        >
          {busy ? "Oluşturuluyor…" : "Gönderiyi oluştur"}
        </button>
      </aside>
    </form>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="input-light mt-2"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-light mt-2">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

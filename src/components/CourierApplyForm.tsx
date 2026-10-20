"use client";

import { useState } from "react";

export default function CourierApplyForm() {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("busy");
    const res = await fetch("/api/kurye-basvuru", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form.entries())),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) {
      setState("done");
      setMessage("Başvurun alındı. Evrak kontrolü için 48 saat içinde arayacağız.");
    } else {
      setState("error");
      setMessage(data.error ?? "Başvuru gönderilemedi.");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-st-delivered/40 bg-st-delivered/10 p-6">
        <p className="font-display text-lg font-semibold text-white">Başvuru alındı</p>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/3 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad Soyad" name="fullName" placeholder="Mert Aksoy" />
        <Field label="Telefon" name="phone" placeholder="05xx xxx xx xx" />
        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Şehir</label>
          <select name="city" className="input-dark mt-2">
            {["İstanbul", "Ankara", "İzmir"].map((c) => (
              <option key={c} className="bg-[#0b1220]">
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Araç</label>
          <select name="vehicle" className="input-dark mt-2">
            {["motosiklet", "bisiklet", "panelvan", "araçsız"].map((v) => (
              <option key={v} className="bg-[#0b1220]">
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Deneyim</label>
        <textarea
          name="experience"
          rows={3}
          placeholder="Kaç yıldır kurye olarak çalışıyorsun, hangi bölgeleri biliyorsun?"
          className="input-dark mt-2"
        />
      </div>
      {state === "error" ? <p className="mt-3 text-sm text-st-risk">{message}</p> : null}
      <button
        type="submit"
        disabled={state === "busy"}
        className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60 sm:w-auto"
      >
        {state === "busy" ? "Gönderiliyor…" : "Başvuruyu gönder"}
      </button>
      <p className="mt-3 text-[11px] text-slate-500">
        Sözleşmeli (esnek vardiya) modelle çalışıyoruz. Başvuru verileri yalnızca değerlendirme için işlenir.
      </p>
    </form>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</label>
      <input name={name} placeholder={placeholder} className="input-dark mt-2" required />
    </div>
  );
}

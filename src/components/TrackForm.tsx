"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrackForm({
  size = "md",
  autoFocus = false,
}: {
  size?: "md" | "lg";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const token = value.trim().toUpperCase().replace(/\s+/g, "");
    if (token.length < 6) {
      setError("Takip kodu en az 6 karakter olmalı.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch(`/api/track/${encodeURIComponent(token)}`);
    setBusy(false);
    if (res.status === 429) {
      setError("Çok fazla deneme yapıldı. Lütfen biraz bekleyin.");
      return;
    }
    if (!res.ok) {
      setError("Bu takip koduyla eşleşen gönderi bulunamadı.");
      return;
    }
    router.push(`/takip/${token}`);
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div
        className={`flex flex-col gap-2 rounded-lg border border-white/12 bg-white/4 p-2 sm:flex-row ${
          size === "lg" ? "sm:p-2.5" : ""
        }`}
      >
        <input
          autoFocus={autoFocus}
          inputMode="text"
          autoCapitalize="characters"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Takip kodu — örn. K7M2QX9PLR4TBN"
          aria-label="Takip kodu"
          className={`w-full bg-transparent px-4 text-slate-100 placeholder:text-slate-500 focus:outline-none ${
            size === "lg" ? "py-4 text-lg tracking-[0.12em]" : "py-3 tracking-[0.08em]"
          }`}
        />
        <button
          type="submit"
          disabled={busy}
          className={`shrink-0 rounded-md bg-accent font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60 ${
            size === "lg" ? "px-8 py-4 text-lg" : "px-6 py-3"
          }`}
        >
          {busy ? "Aranıyor…" : "Gönderimi bul"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-st-risk">{error}</p> : null}
    </form>
  );
}

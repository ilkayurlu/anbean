"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO = [
  { email: "musteri@anbean.com.tr", role: "Müşteri", panel: "/app" },
  { email: "kurye@anbean.com.tr", role: "Kurye", panel: "/courier" },
  { email: "ops@anbean.com.tr", role: "Operasyon", panel: "/ops" },
  { email: "finans@anbean.com.tr", role: "Finans", panel: "/admin/finans" },
  { email: "destek@anbean.com.tr", role: "Destek", panel: "/admin/destek" },
  { email: "admin@anbean.com.tr", role: "Yönetici", panel: "/admin" },
];

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("musteri@anbean.com.tr");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string };
    setBusy(false);
    if (res.ok && data.redirect) {
      router.push(data.redirect);
      router.refresh();
    } else {
      // Hangi bilginin yanlış olduğu söylenmez.
      setError(data.error ?? "Giriş yapılamadı.");
    }
  }

  return (
    <div className="rounded-lg border border-white/12 bg-white/4 p-6">
      <form onSubmit={submit}>
        <label htmlFor="login-email" className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
          E-posta
        </label>
        <input
          id="login-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          className="input-dark mt-2"
          required
        />
        <label htmlFor="login-password" className="mt-4 block text-[11px] uppercase tracking-[0.14em] text-slate-500">
          Şifre
        </label>
        <input
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          className="input-dark mt-2"
          required
        />
        {error ? (
          <p role="alert" className="mt-3 text-sm text-st-risk">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60"
        >
          {busy ? "Giriş yapılıyor…" : "Giriş yap"}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-xs">
        <Link href="/sifremi-unuttum" className="text-slate-400 underline-offset-4 hover:text-white hover:underline">
          Şifremi unuttum
        </Link>
        <Link href="/kayit" className="font-semibold text-accent underline-offset-4 hover:underline">
          Hesap oluştur
        </Link>
      </div>

      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Demo hesaplar (şifre: 1234)</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DEMO.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword("1234");
              }}
              className="rounded-md border border-white/12 bg-white/3 px-3 py-2 text-left text-xs text-slate-300 transition hover:border-accent/50"
            >
              <span className="block font-semibold text-white">{account.role}</span>
              <span className="block text-[10px] text-slate-500">{account.panel}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Bu hesaplar geçici erişim koduyla çalışır. Yeni kayıt olan kullanıcılarda şifre scrypt ile hash&apos;lenir.
        </p>
      </div>
    </div>
  );
}

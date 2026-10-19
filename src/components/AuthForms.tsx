"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const MIN_PASSWORD = 8;

function passwordHint(value: string): string | null {
  if (value.length === 0) return null;
  if (value.length < MIN_PASSWORD) return `En az ${MIN_PASSWORD} karakter olmalı.`;
  if (!/[A-Za-zçğıöşüÇĞİÖŞÜ]/.test(value)) return "En az bir harf içermeli.";
  if (!/\d/.test(value)) return "En az bir rakam içermeli.";
  return null;
}

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    passwordRepeat: "",
    kvkkConsent: false,
    marketingConsent: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const hint = passwordHint(form.password);
  const mismatch = form.passwordRepeat.length > 0 && form.password !== form.passwordRepeat;
  const canSubmit =
    form.fullName.trim().length >= 3 &&
    form.email.includes("@") &&
    !hint &&
    form.password === form.passwordRepeat &&
    form.kvkkConsent;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string };
    setBusy(false);
    if (res.ok && data.redirect) {
      router.push(data.redirect);
      router.refresh();
      return;
    }
    setError(data.error ?? "Kayıt tamamlanamadı.");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/12 bg-white/4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Ad soyad">
          <input
            id="fullName"
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            className="input-dark"
            autoComplete="name"
            required
          />
        </Field>
        <Field id="phone" label="Telefon (opsiyonel)">
          <input
            id="phone"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="input-dark"
            autoComplete="tel"
            inputMode="tel"
          />
        </Field>
      </div>
      <Field id="email" label="E-posta" className="mt-4">
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          className="input-dark"
          autoComplete="email"
          required
        />
      </Field>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field id="password" label="Şifre">
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            className="input-dark"
            autoComplete="new-password"
            required
          />
        </Field>
        <Field id="passwordRepeat" label="Şifre (tekrar)">
          <input
            id="passwordRepeat"
            type="password"
            value={form.passwordRepeat}
            onChange={(e) => set("passwordRepeat", e.target.value)}
            className="input-dark"
            autoComplete="new-password"
            required
          />
        </Field>
      </div>
      {hint ? <p className="mt-2 text-xs text-st-waiting">{hint}</p> : null}
      {mismatch ? <p className="mt-1 text-xs text-st-risk">Şifreler eşleşmiyor.</p> : null}

      <label className="mt-5 flex gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={form.kvkkConsent}
          onChange={(e) => set("kvkkConsent", e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          required
        />
        <span>
          <Link href="/yasal/kvkk" className="text-accent underline-offset-4 hover:underline">
            KVKK aydınlatma metnini
          </Link>{" "}
          okudum, kişisel verilerimin teslimat hizmeti için işlenmesini onaylıyorum. (zorunlu)
        </span>
      </label>
      <label className="mt-3 flex gap-3 text-sm text-slate-400">
        <input
          type="checkbox"
          checked={form.marketingConsent}
          onChange={(e) => set("marketingConsent", e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
        />
        <span>Kampanya ve duyuru e-postası almak istiyorum. (opsiyonel)</span>
      </label>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-st-risk">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || !canSubmit}
        className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-50"
      >
        {busy ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
      </button>
      <p className="mt-3 text-center text-xs text-slate-500">
        Zaten hesabın var mı?{" "}
        <Link href="/giris" className="text-accent underline-offset-4 hover:underline">
          Giriş yap
        </Link>
      </p>
      <p className="mt-3 text-[11px] text-slate-600">
        Rolünüz otomatik &quot;Müşteri&quot; olarak atanır; yetki yükseltme talebi admin onayı gerektirir.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  children,
  className = "",
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ForgotInner() {
  const params = useSearchParams();
  const tokenFromUrl = params.get("token") ?? "";
  const [step, setStep] = useState<"email" | "sent" | "reset" | "done">(tokenFromUrl ? "reset" : "email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const hint = passwordHint(password);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    // Hesap olsun olmasın aynı ekran: enumeration engeli.
    setStep("sent");
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (hint) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (res.ok) {
      setStep("done");
      return;
    }
    setError(data.error ?? "Şifre sıfırlanamadı.");
  }

  if (step === "sent") {
    return (
      <div className="rounded-lg border border-white/12 bg-white/4 p-6">
        <h2 className="font-display text-lg font-semibold text-white">İsteğin alındı</h2>
        <p className="mt-2 text-sm text-slate-300">
          Bu e-posta kayıtlıysa sıfırlama bağlantısı gönderildi. Bağlantı 30 dakika geçerlidir.
        </p>
        <p className="mt-4 rounded-md border border-st-waiting/40 bg-st-waiting/10 p-3 text-xs text-slate-300">
          <strong className="text-white">Demo notu:</strong> e-posta sağlayıcısı bağlı değil. Bağlantı sunucu
          günlüğüne <code className="text-accent">[sifre-sifirlama]</code> satırıyla yazılır; oradan alıp
          aşağıya yapıştırabilirsin.
        </p>
        <div className="mt-4">
          <label htmlFor="token" className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            Sıfırlama token&apos;ı
          </label>
          <input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="input-dark mt-2 font-mono text-xs"
            placeholder="sunucu günlüğünden kopyala"
          />
          <button
            type="button"
            onClick={() => setStep(token.trim().length >= 20 ? "reset" : "sent")}
            disabled={token.trim().length < 20}
            className="mt-3 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-50"
          >
            Token ile devam et
          </button>
        </div>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <form onSubmit={reset} className="rounded-lg border border-white/12 bg-white/4 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Yeni şifre belirle</h2>
        <label htmlFor="new-password" className="mt-4 block text-[11px] uppercase tracking-[0.14em] text-slate-500">
          Yeni şifre
        </label>
        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-dark mt-2"
          autoComplete="new-password"
          required
        />
        {hint ? <p className="mt-2 text-xs text-st-waiting">{hint}</p> : null}
        {error ? (
          <p role="alert" className="mt-3 text-sm text-st-risk">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || Boolean(hint)}
          className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-50"
        >
          {busy ? "Kaydediliyor…" : "Şifreyi güncelle"}
        </button>
      </form>
    );
  }

  if (step === "done") {
    return (
      <div className="rounded-lg border border-st-delivered/40 bg-st-delivered/10 p-6 text-center">
        <h2 className="font-display text-lg font-semibold text-white">Şifren güncellendi</h2>
        <Link
          href="/giris"
          className="mt-4 inline-block rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220]"
        >
          Giriş yap
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={requestReset} className="rounded-lg border border-white/12 bg-white/4 p-6">
      <label htmlFor="forgot-email" className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
        E-posta
      </label>
      <input
        id="forgot-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-dark mt-2"
        autoComplete="email"
        required
      />
      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60"
      >
        {busy ? "Gönderiliyor…" : "Sıfırlama bağlantısı iste"}
      </button>
      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href="/giris" className="text-accent underline-offset-4 hover:underline">
          Girişe dön
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  return (
    <Suspense fallback={<div className="h-64 rounded-lg border border-white/10 bg-white/3" />}>
      <ForgotInner />
    </Suspense>
  );
}

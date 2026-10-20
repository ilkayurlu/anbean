"use client";

import { useState } from "react";

type ApplicationKind = "restaurant" | "fleet";

const services = [
  ["kurye", "Kurye"],
  ["surucu", "Sürücü"],
  ["arac_kiralama", "Araç kiralama"],
  ["dagitim", "Dağıtım"],
] as const;

export default function PartnerApplicationForm({ kind }: { kind: ApplicationKind }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload: Record<string, unknown> = Object.fromEntries(values.entries());
    payload.kvkkConsent = values.has("kvkkConsent");
    payload.communicationConsent = values.has("communicationConsent");
    if (kind === "fleet") {
      payload.serviceTypes = values.getAll("serviceTypes");
      payload.regions = String(values.get("regions") ?? "")
        .split(",")
        .map((region) => region.trim())
        .filter(Boolean);
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/partner-applications/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Başvuru gönderilemedi. Bilgileri kontrol edip tekrar deneyin.");
        return;
      }
      setSuccess(true);
      setMessage("Başvurunuz alındı. Değerlendirme sonucu için verdiğiniz e-posta veya telefon üzerinden sizinle iletişime geçeceğiz.");
      form.reset();
    } catch {
      setMessage("Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = "input-dark mt-2";
  const fieldLabel = "text-[11px] uppercase tracking-[0.14em] text-slate-500";

  return (
    <form onSubmit={submit} className="rounded-lg border border-white/10 bg-white/3 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={kind === "restaurant" ? "İşletme adı" : "Şirket adı"} name="businessName" required />
        <Field label="Yetkili kişi" name="contactName" required />
        <Field label="E-posta" name="email" type="email" required />
        <Field label="Telefon" name="phone" type="tel" required />
        {kind === "restaurant" ? (
          <>
            <Field label="Şehir" name="city" required />
            <Field label="İlçe" name="district" required />
            <Field label="Mutfak / kategori" name="cuisine" required />
            <Field label="Web sitesi (opsiyonel)" name="website" type="url" />
          </>
        ) : (
          <>
            <div>
              <label className={fieldLabel} htmlFor="vehicleCountRange">Araç sayısı aralığı</label>
              <select id="vehicleCountRange" name="vehicleCountRange" className={fieldClass} required defaultValue="">
                <option value="" disabled>Aralık seçin</option>
                {["1-5", "6-20", "21-50", "51+"].map((range) => <option key={range} value={range}>{range}</option>)}
              </select>
            </div>
            <Field label="Web sitesi (opsiyonel)" name="website" type="url" />
          </>
        )}
      </div>

      {kind === "restaurant" ? (
        <>
          <div className="mt-4">
            <label className={fieldLabel} htmlFor="address">Açık adres</label>
            <textarea id="address" name="address" rows={3} maxLength={300} className={fieldClass} required />
          </div>
          <div className="mt-4">
            <label className={fieldLabel} htmlFor="openingHours">Çalışma saatleri (opsiyonel)</label>
            <textarea id="openingHours" name="openingHours" rows={2} maxLength={1000} className={fieldClass} />
          </div>
        </>
      ) : (
        <>
          <fieldset className="mt-4">
            <legend className={fieldLabel}>Hizmet türleri</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {services.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" name="serviceTypes" value={value} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4">
            <label className={fieldLabel} htmlFor="regions">Şehirler / bölgeler (virgülle ayırın)</label>
            <input id="regions" name="regions" className={fieldClass} placeholder="İstanbul, Ankara" required />
          </div>
          <div className="mt-4">
            <label className={fieldLabel} htmlFor="references">Referanslar (opsiyonel)</label>
            <textarea id="references" name="references" rows={3} maxLength={2000} className={fieldClass} />
          </div>
        </>
      )}

      <div className="mt-5 space-y-3 text-sm text-slate-300">
        <label className="flex items-start gap-2">
          <input className="mt-1" type="checkbox" name="kvkkConsent" required />
          <span><a className="underline" href="/yasal/kvkk-aydinlatma" target="_blank" rel="noreferrer">KVKK aydınlatma metnini</a> okudum ve başvurumun değerlendirilmesi için gerekli verilerin işlenmesini kabul ediyorum.</span>
        </label>
        <label className="flex items-start gap-2">
          <input className="mt-1" type="checkbox" name="communicationConsent" />
          <span>İş ortaklığı ve hizmetler hakkında ticari ileti almayı kabul ediyorum (opsiyonel).</span>
        </label>
      </div>

      {message ? (
        <p role={success ? "status" : "alert"} className={`mt-4 text-sm ${success ? "text-st-delivered" : "text-st-risk"}`}>
          {message}
        </p>
      ) : null}
      {!success ? (
        <button type="submit" disabled={busy} className="mt-5 w-full rounded-md bg-accent px-5 py-3 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60 sm:w-auto">
          {busy ? "Gönderiliyor…" : "Başvuruyu gönder"}
        </button>
      ) : null}
      <p className="mt-3 text-[11px] text-slate-500">
        Başvuru gönderimi işletme hesabı açmaz. Onay sonrası hesap erişimi, e-posta doğrulamalı güvenli bağlama süreciyle sağlanacaktır.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.14em] text-slate-500" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} className="input-dark mt-2" required={required} maxLength={200} />
    </div>
  );
}

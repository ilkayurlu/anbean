"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PartnerApplicationRow = {
  id: number;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  details: string[];
  status: string;
  reviewReason: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Yeni",
  in_review: "İncelemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

export default function PartnerReviewQueue({
  kind,
  applications,
}: {
  kind: "restaurant" | "fleet";
  applications: PartnerApplicationRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function decide(id: number, status: "in_review" | "approved" | "rejected", reason = "") {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/partner-applications/${kind}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Başvuru güncellenemedi.");
        return;
      }
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  async function attachMember(id: number, email: string) {
    setBusyId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/partner-applications/${kind}/${id}/member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Hesap bağlanamadı.");
        return;
      }
      router.refresh();
    } catch {
      setError("Sunucuya ulaşılamadı. Tekrar deneyin.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      {applications.map((application) => (
        <ApplicationCard
          key={application.id}
          application={application}
          busy={busyId === application.id}
          onDecision={decide}
          onAttach={attachMember}
        />
      ))}
      {applications.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Henüz başvuru yok.
        </p>
      ) : null}
    </div>
  );
}

function ApplicationCard({
  application,
  busy,
  onDecision,
  onAttach,
}: {
  application: PartnerApplicationRow;
  busy: boolean;
  onDecision: (id: number, status: "in_review" | "approved" | "rejected", reason?: string) => void;
  onAttach: (id: number, email: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [accountEmail, setAccountEmail] = useState(application.email);
  const pending = application.status === "submitted";
  const reviewing = application.status === "in_review";

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#0B1220]">{application.businessName}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {application.contactName} · {application.email} · {application.phone}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {[application.city, application.district].filter(Boolean).join(" · ") || "Bölge belirtilmedi"} ·{" "}
            {new Date(application.createdAt).toLocaleString("tr-TR")}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {STATUS_LABEL[application.status] ?? application.status}
        </span>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {application.details.map((detail) => {
          const [label, ...values] = detail.split(": ");
          return (
            <div key={detail}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-slate-800">{values.join(": ") || "—"}</dd>
            </div>
          );
        })}
      </dl>
      {application.reviewReason ? (
        <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">Red gerekçesi: {application.reviewReason}</p>
      ) : null}
      {pending ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecision(application.id, "in_review")}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Kaydediliyor…" : "İncelemeye al"}
        </button>
      ) : null}
      {reviewing ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecision(application.id, "approved")}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Onayla
          </button>
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <input
              aria-label="Red gerekçesi"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              placeholder="Red gerekçesi (zorunlu)"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || reason.trim().length < 5}
              onClick={() => onDecision(application.id, "rejected", reason)}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Reddet
            </button>
          </div>
        </div>
      ) : null}
      {application.status === "approved" ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Başvuru sahibinin hesabı ayrıca bağlanır. E-posta/kimliği haricen doğruladıktan sonra devam edin.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="İş ortağı kullanıcı e-postası"
              type="email"
              value={accountEmail}
              onChange={(event) => setAccountEmail(event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy || !accountEmail.trim()}
              onClick={() => onAttach(application.id, accountEmail)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50"
            >
              Hesabı bağla
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

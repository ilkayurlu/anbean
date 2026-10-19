"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Send } from "lucide-react";

const CATEGORIES = [
  { value: "teslimat_sorunu", label: "Teslimat sorunu" },
  { value: "odeme", label: "Ödeme / cüzdan" },
  { value: "arac_sorunu", label: "Araç sorunu" },
  { value: "sikayet", label: "Şikâyet" },
  { value: "diger", label: "Diğer" },
];

export type TicketRow = {
  id: number;
  code: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  shipmentId: number | null;
  createdAt: Date | string;
  ownerName?: string;
};

const STATUS_LABEL: Record<string, string> = {
  acik: "Açık",
  isleniyor: "İşleniyor",
  cozuldu: "Çözüldü",
  kapatildi: "Kapatıldı",
};

export function TicketComposer({ shipments }: { shipments: { id: number; code: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    category: "teslimat_sorunu",
    subject: "",
    description: "",
    shipmentId: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: form.category,
        subject: form.subject,
        description: form.description,
        shipmentId: form.shipmentId ? Number(form.shipmentId) : undefined,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Talep oluşturulamadı.");
      return;
    }
    setForm({ category: "teslimat_sorunu", subject: "", description: "", shipmentId: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Yeni talep</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ticket-category" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            Kategori
          </label>
          <select
            id="ticket-category"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="input-light mt-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ticket-shipment" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
            İlgili gönderi (opsiyonel)
          </label>
          <select
            id="ticket-shipment"
            value={form.shipmentId}
            onChange={(e) => setForm((f) => ({ ...f, shipmentId: e.target.value }))}
            className="input-light mt-2"
          >
            <option value="">Seçilmedi</option>
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="ticket-subject" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
          Konu
        </label>
        <input
          id="ticket-subject"
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          className="input-light mt-2"
          maxLength={140}
          required
        />
      </div>
      <div className="mt-4">
        <label htmlFor="ticket-description" className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
          Açıklama
        </label>
        <textarea
          id="ticket-description"
          rows={4}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="input-light mt-2"
          minLength={10}
          maxLength={2000}
          required
        />
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-st-risk">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft disabled:opacity-60"
      >
        {busy ? "Gönderiliyor…" : "Talebi aç"}
      </button>
      <p className="mt-3 text-[11px] text-slate-500">
        Talebe şifre, kart numarası veya kimlik bilgisi yazmayın. Görüşmeler denetim kaydına işlenir.
      </p>
    </form>
  );
}

export function TicketList({
  tickets,
  canManage,
  selectedId,
  onSelect,
}: {
  tickets: TicketRow[];
  canManage: boolean;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  if (tickets.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Henüz destek talebin yok.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tickets.map((ticket) => {
        const active = ticket.id === selectedId;
        return (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => onSelect(active ? null : ticket.id)}
              aria-expanded={active}
              className={`w-full rounded-lg border p-4 text-left transition ${
                active ? "border-accent bg-white" : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-sm font-bold text-[#0B1220]">{ticket.code}</span>
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    color: ticket.status === "cozuldu" ? "#15803d" : ticket.status === "acik" ? "#B45309" : "#334155",
                    backgroundColor:
                      ticket.status === "cozuldu" ? "#dcfce7" : ticket.status === "acik" ? "#fef3c7" : "#e2e8f0",
                  }}
                >
                  {STATUS_LABEL[ticket.status] ?? ticket.status}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-700">{ticket.subject}</p>
              <p className="mt-1 text-xs text-slate-500">
                {CATEGORIES.find((c) => c.value === ticket.category)?.label ?? ticket.category}
                {canManage && ticket.ownerName ? ` · ${ticket.ownerName}` : ""} ·{" "}
                {new Date(ticket.createdAt).toLocaleDateString("tr-TR")}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TicketThread({ ticketId, canManage }: { ticketId: number; canManage: boolean }) {
  const router = useRouter();
  type Message = {
    id: number;
    body: string;
    authorName: string;
    authorRole: string;
    createdAt: string;
  };
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  // reload anahtarı: mesaj gönderildikten sonra listeyi tazelemek için.
  const [nonce, setNonce] = useState(0);
  const snapshotKey = `${ticketId}:${nonce}`;
  // Yüklü veriler tek snapshot'ta: hangi talep/nonce için geldiği belli,
  // "yüklendi mi" bayrağı ayrıca tutulmaz (render'da türetilir).
  const [snapshot, setSnapshot] = useState<{
    key: string;
    messages: Message[];
    status: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/support/${ticketId}`, { cache: "no-store" });
      if (cancelled) return;
      if (!res.ok) {
        setError("Talep yüklenemedi.");
        setSnapshot({ key: snapshotKey, messages: [], status: "" });
        return;
      }
      const data = (await res.json()) as { messages: Message[]; ticket: { status: string } };
      if (cancelled) return;
      setError("");
      setSnapshot({ key: snapshotKey, messages: data.messages, status: data.ticket.status });
    })();
    return () => {
      cancelled = true;
    };
  }, [ticketId, snapshotKey]);

  const loaded = snapshot?.key === snapshotKey;
  const messages = loaded ? snapshot.messages : [];
  const status = loaded ? snapshot.status : "";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (draft.trim().length < 2) return;
    setError("");
    const res = await fetch(`/api/support/${ticketId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
    if (!res.ok) {
      setError(data.error ?? "Mesaj gönderilemedi.");
      return;
    }
    setDraft("");
    setNonce((n) => n + 1);
    router.refresh();
  }

  async function changeStatus(next: string) {
    setError("");
    const res = await fetch(`/api/support/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Durum değiştirilemedi.");
      return;
    }
    setNonce((n) => n + 1);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      {error ? (
        <p role="alert" className="mb-3 text-sm text-st-risk">
          {error}
        </p>
      ) : null}
      <ol className="space-y-3">
        {messages.map((message) => (
          <li
            key={message.id}
            className={`rounded-md p-3 text-sm ${
              message.authorRole === "musteri" ? "bg-slate-50 text-slate-700" : "bg-[#0B1220] text-slate-100"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.body}</p>
            <p
              className={`mt-1.5 text-[11px] ${
                message.authorRole === "musteri" ? "text-slate-500" : "text-slate-400"
              }`}
            >
              {message.authorName} · {new Date(message.createdAt).toLocaleString("tr-TR")}
            </p>
          </li>
        ))}
        {!loaded ? <li className="text-sm text-slate-500">Yükleniyor…</li> : null}
      </ol>

      {status !== "kapatildi" ? (
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Yanıt yaz…"
            aria-label="Yanıt"
            className="input-light"
            maxLength={2000}
          />
          <button
            type="submit"
            aria-label="Gönder"
            className="flex h-11 w-12 shrink-0 items-center justify-center rounded-md bg-accent text-[#0B1220] transition hover:bg-accent-soft"
          >
            <Send size={16} aria-hidden />
          </button>
        </form>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Talep kapatılmış.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        {canManage ? (
          <>
            <ActionButton label="İşleniyor" onClick={() => changeStatus("isleniyor")} disabled={status === "isleniyor"} />
            <ActionButton label="Çözüldü" onClick={() => changeStatus("cozuldu")} disabled={status === "cozuldu"} />
            <ActionButton label="Kapat" onClick={() => changeStatus("kapatildi")} disabled={status === "kapatildi"} />
          </>
        ) : (
          <ActionButton label="Talebi kapat" onClick={() => changeStatus("kapatildi")} disabled={status === "kapatildi"} />
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-500 disabled:opacity-40"
    >
      {label}
    </button>
  );
}

export { STATUS_LABEL };

/** Talep oluştur + listele + seçili talebin görüşmesini bir arada yönetir. */
export function SupportDesk({
  tickets,
  shipments,
  canManage,
}: {
  tickets: TicketRow[];
  shipments: { id: number; code: string }[];
  canManage: boolean;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        {canManage ? null : <TicketComposer shipments={shipments} />}
        <TicketList
          tickets={tickets}
          canManage={canManage}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />
      </div>
      <div>
        {selectedId ? (
          <TicketThread ticketId={selectedId} canManage={canManage} />
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Görüşmeyi açmak için soldan bir talep seç.
          </p>
        )}
      </div>
    </div>
  );
}

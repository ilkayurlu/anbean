import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { couriers, ledgerEntries, payoutRequests, wallets } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { PLATFORM_OPENING_KURUS } from "@/lib/ledger";
import { formatTry } from "@/lib/pricing";
import { STATUS_COLOR } from "@/lib/status";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import { PayoutDecide } from "@/components/PayoutForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finans — Anbean" };

/**
 * Platform açılış sermayesi. Çift taraflı kayıtta tüm cüzdan bakiyelerinin
 * toplamı sabit kalır: toplam bu değerden sapıyorsa bir yerde tek taraflı
 * kayıt yazılmıştır. Bu, "ledger dengeli mi?" sorusunun mutabakat cevabıdır.
 */

const STATUS_LABEL: Record<string, string> = {
  beklemede: "Beklemede",
  onaylandi: "Onaylandı",
  odendi: "Ödendi",
  reddedildi: "Reddedildi",
};

const KIND_LABEL: Record<string, string> = {
  deposit: "Bakiye yükleme",
  ride_charge: "Sürüş ücreti",
  shipment_charge: "Gönderi ücreti",
  guarantee_refund: "Güvence iadesi",
  courier_payout: "Saha hakedişi",
  payout: "Hakediş çıkışı",
  reversal: "Ters kayıt",
};

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function FinansPage() {
  const user = await requirePermission("finance:read");
  if (!user) redirect("/giris");
  const canDecide = user.role === "admin" || user.role === "finance";

  const [walletRows, ledgerRows, payoutRows, courierRows] = await Promise.all([
    db.select().from(wallets),
    db.select().from(ledgerEntries).orderBy(desc(ledgerEntries.createdAt)).limit(40),
    db.select().from(payoutRequests).orderBy(desc(payoutRequests.createdAt)).limit(30),
    db.select().from(couriers),
  ]);

  const courierNameById = new Map(courierRows.map((c) => [c.id, c.fullName]));

  // Mutabakat 1: cüzdan toplamı açılış sermayesine eşit mi?
  const [{ total }] = await db
    .select({ total: sql<number>`coalesce(sum(${wallets.balanceKurus}), 0)` })
    .from(wallets);
  const walletSum = Number(total ?? 0);
  const reconciled = walletSum === PLATFORM_OPENING_KURUS;

  // Mutabakat 2: her işlem kendi içinde dengeli mi? (tam tarama, örneklem değil)
  const txTotals = await db
    .select({
      txId: ledgerEntries.txId,
      debit: sql<number>`sum(case when ${ledgerEntries.side} = 'debit' then ${ledgerEntries.amountKurus} else 0 end)`,
      credit: sql<number>`sum(case when ${ledgerEntries.side} = 'credit' then ${ledgerEntries.amountKurus} else 0 end)`,
    })
    .from(ledgerEntries)
    .groupBy(ledgerEntries.txId);
  const unbalanced = txTotals.filter((row) => Number(row.debit) !== Number(row.credit));
  const allBalanced = unbalanced.length === 0;

  const inflow = ledgerRows
    .filter((r) => r.side === "credit" && r.kind !== "deposit")
    .reduce((sum, r) => sum + r.amountKurus, 0);
  const payoutsPaid = payoutRows.filter((p) => p.status === "odendi").reduce((s, p) => s + p.amountKurus, 0);
  const pendingPayouts = payoutRows.filter((p) => p.status === "beklemede" || p.status === "onaylandi");

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Finans · cüzdan ve ledger"
      subtitle="Kayıtlar salt okunur: veritabanı UPDATE/DELETE/TRUNCATE'i trigger ile reddeder."
      nav={[
        { href: "/admin", label: "Yönetim" },
        { href: "/admin/finans", label: "Finans" },
        { href: "/admin/destek", label: "Destek" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Cüzdan toplamı" value={formatTry(walletSum)} />
        <Metric
          label="Mutabakat"
          value={reconciled ? "Dengeli" : "Kaymış"}
          tone={reconciled ? STATUS_COLOR.delivered : STATUS_COLOR.risk}
        />
        <Metric label="Gelir (son 40 kayıt)" value={formatTry(inflow)} tone="#0B1220" />
        <Metric label="Ödenen hakediş" value={formatTry(payoutsPaid)} tone={STATUS_COLOR.delivered} />
      </div>

      {!reconciled ? (
        <p
          className="mt-4 rounded-md border p-4 text-sm"
          style={{ borderColor: `${STATUS_COLOR.risk}55`, backgroundColor: `${STATUS_COLOR.risk}12`, color: "#0B1220" }}
        >
          Cüzdan toplamı ({formatTry(walletSum)}) açılış sermayesinden ({formatTry(PLATFORM_OPENING_KURUS)}) farklı.
          Tek taraflı bir kayıt yazılmış olabilir — ledger&apos;ı incele.
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card
          title={`Hakediş çıkışları · maker-checker`}
          action={
            <span className="text-xs text-slate-500">{pendingPayouts.length} bekleyen</span>
          }
        >
          {payoutRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Talep yok.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {payoutRows.map((request) => (
                <li key={request.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-display text-sm font-bold text-[#0B1220]">
                        {request.code} · {formatTry(request.amountKurus)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {courierNameById.get(request.courierId) ?? `kurye #${request.courierId}`} ·{" "}
                        <span className="font-mono">{request.ibanMasked}</span> ·{" "}
                        {formatDateTime(request.createdAt)}
                      </p>
                      {request.ledgerTxId ? (
                        <p className="text-[11px] text-slate-400">ledger tx: {request.ledgerTxId.slice(0, 22)}…</p>
                      ) : null}
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        color:
                          request.status === "odendi"
                            ? STATUS_COLOR.delivered
                            : request.status === "reddedildi"
                              ? STATUS_COLOR.risk
                              : STATUS_COLOR.waiting,
                        backgroundColor: `${
                          request.status === "odendi"
                            ? STATUS_COLOR.delivered
                            : request.status === "reddedildi"
                              ? STATUS_COLOR.risk
                              : STATUS_COLOR.waiting
                        }1f`,
                      }}
                    >
                      {STATUS_LABEL[request.status] ?? request.status}
                    </span>
                  </div>
                  {canDecide ? (
                    <div className="mt-2">
                      <PayoutDecide
                        requestId={request.id}
                        status={request.status}
                        requestedByMe={request.requestedByUserId === user.id}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Cüzdanlar"
          action={
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                color: allBalanced ? STATUS_COLOR.delivered : STATUS_COLOR.risk,
                backgroundColor: `${allBalanced ? STATUS_COLOR.delivered : STATUS_COLOR.risk}1f`,
              }}
            >
              {txTotals.length} tx · {allBalanced ? "hepsi dengeli" : `${unbalanced.length} dengesiz`}
            </span>
          }
        >
          <ul className="divide-y divide-slate-100 text-sm">
            {walletRows.map((wallet) => (
              <li key={wallet.id} className="flex items-center justify-between py-2.5">
                <span className="text-slate-700">
                  {wallet.ownerKind} #{wallet.ownerId}
                  {wallet.ownerKind === "courier" ? (
                    <span className="ml-2 text-xs text-slate-500">
                      {courierNameById.get(wallet.ownerId) ?? ""}
                    </span>
                  ) : null}
                </span>
                <span
                  className="font-display text-sm font-bold tabular-nums"
                  style={{ color: wallet.balanceKurus < 0 ? STATUS_COLOR.risk : "#0B1220" }}
                >
                  {formatTry(wallet.balanceKurus)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Ledger kayıtları (salt okunur)">
          <ul className="max-h-96 divide-y divide-slate-100 overflow-auto text-sm">
            {ledgerRows.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {KIND_LABEL[entry.kind] ?? entry.kind} · {entry.reason}
                  </p>
                  <p className="text-xs text-slate-500">
                    cüzdan #{entry.walletId} · {entry.side} · {formatDateTime(entry.createdAt)}
                  </p>
                </div>
                <span
                  className="shrink-0 font-display text-sm font-bold tabular-nums"
                  style={{ color: entry.side === "credit" ? STATUS_COLOR.delivered : STATUS_COLOR.risk }}
                >
                  {entry.side === "credit" ? "+" : "−"}
                  {formatTry(entry.amountKurus)}
                </span>
              </li>
            ))}
            {ledgerRows.length === 0 ? <li className="py-6 text-sm text-slate-500">Kayıt yok.</li> : null}
          </ul>
        </Card>

        <Card title="Mutabakat notu">
          <ul className="space-y-2 text-sm text-slate-600">
            <li>· Her işlem iki bacaklı yazılır: toplam debit = toplam credit.</li>
            <li>· Hata olursa kayıt silinmez, ters kayıt (reversal) atılır.</li>
            <li>
              · Talebi açan finans kullanıcısı kendi talebini onaylayamaz; sunucu aynı userId&apos;yi reddeder ve
              denetime yazar.
            </li>
            <li>
              · Bilinen sınır: demo cüzdanlarındaki bakiyeler gerçek para değil; ödeme sağlayıcısı bağlı değil.
            </li>
          </ul>
        </Card>
      </div>
    </PanelShell>
  );
}

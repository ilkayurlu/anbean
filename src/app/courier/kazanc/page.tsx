import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { couriers, ledgerEntries, payoutRequests, wallets } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { formatTry } from "@/lib/pricing";
import { STATUS_COLOR } from "@/lib/status";
import { dayKey, lastDays, nowDate } from "@/lib/clock";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import EarningsChart from "@/components/EarningsChart";
import { PayoutRequestForm } from "@/components/PayoutForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kazanç — Anbean Kurye" };

const PAYOUT_LABEL: Record<string, string> = {
  beklemede: "Beklemede",
  onaylandi: "Onaylandı",
  odendi: "Ödendi",
  reddedildi: "Reddedildi",
};

export default async function KazancPage() {
  const user = await requirePermission("courier:payout:request");
  if (!user) redirect("/giris");

  const [courier] = await db.select().from(couriers).where(eq(couriers.userId, user.id)).limit(1);
  if (!courier) redirect("/courier");

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.ownerKind, "courier"), eq(wallets.ownerId, courier.id)))
    .limit(1);

  const entries = wallet
    ? await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.walletId, wallet.id))
        .orderBy(desc(ledgerEntries.createdAt))
        .limit(200)
    : [];

  const payouts = await db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.courierId, courier.id))
    .orderBy(desc(payoutRequests.createdAt));

  // Son 7 gün, kazanç (credit) bazında.
  const days = lastDays(7).map((day) => ({ label: day.label, key: day.key, value: 0 }));
  const indexByKey = new Map(days.map((day, i) => [day.key, i]));
  const today = dayKey(nowDate());
  let todayTotal = 0;
  let weekTotal = 0;
  for (const entry of entries) {
    if (entry.side !== "credit") continue;
    weekTotal += entry.amountKurus;
    const key = dayKey(entry.createdAt);
    if (key === today) todayTotal += entry.amountKurus;
    const idx = indexByKey.get(key);
    if (idx !== undefined) days[idx].value += entry.amountKurus;
  }

  const paidOut = payouts.filter((p) => p.status === "odendi").reduce((s, p) => s + p.amountKurus, 0);
  const pending = payouts.find((p) => p.status === "beklemede" || p.status === "onaylandi");

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Kazancın"
      subtitle="Hakediş görev bittiği an bu cüzdana geçer. Kayıtlar silinemez."
      nav={[
        { href: "/courier", label: "Görevler" },
        { href: "/courier/kazanc", label: "Kazanç" },
        { href: "/filo-haritasi", label: "Filo" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Kullanılabilir" value={formatTry(wallet?.balanceKurus ?? 0)} tone={STATUS_COLOR.delivered} />
        <Metric label="Bugün" value={formatTry(todayTotal)} tone="#0B1220" />
        <Metric label="Son 200 kayıt" value={formatTry(weekTotal)} />
        <Metric label="Bankaya çıkan" value={formatTry(paidOut)} tone={STATUS_COLOR.transit} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card title="Son 7 gün">
          <EarningsChart data={days} formatValue={(v) => formatTry(v)} />
          <p className="mt-3 text-xs text-slate-500">
            Çubuklar cüzdanına geçen hakedişleri gösterir: saha görevleri ve teslimat primleri.
          </p>
        </Card>

        <div className="space-y-5">
          {pending ? (
            <Card title="Bekleyen talep">
              <p className="text-sm text-slate-600">
                <strong className="text-[#0B1220]">{pending.code}</strong> · {formatTry(pending.amountKurus)} ·{" "}
                {PAYOUT_LABEL[pending.status]}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Finans onayından sonra banka çıkışı yapılır. Onaylayan kişi talebi açan olamaz.
              </p>
            </Card>
          ) : (
            <PayoutRequestForm balanceKurus={wallet?.balanceKurus ?? 0} />
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="Hareket dökümü">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Henüz hakediş kaydı yok.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-auto text-sm">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-slate-800">{entry.reason.replaceAll("_", " ")}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(entry.createdAt).toLocaleString("tr-TR")} · {entry.kind}
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
            </ul>
          )}
        </Card>

        <Card title="Para çekme geçmişi">
          {payouts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Talep yok.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {payouts.map((payout) => (
                <li key={payout.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-slate-800">
                      {payout.code} · {formatTry(payout.amountKurus)}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{payout.ibanMasked}</span> ·{" "}
                      {new Date(payout.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      color:
                        payout.status === "odendi"
                          ? STATUS_COLOR.delivered
                          : payout.status === "reddedildi"
                            ? STATUS_COLOR.risk
                            : STATUS_COLOR.waiting,
                      backgroundColor: `${
                        payout.status === "odendi"
                          ? STATUS_COLOR.delivered
                          : payout.status === "reddedildi"
                            ? STATUS_COLOR.risk
                            : STATUS_COLOR.waiting
                      }1f`,
                    }}
                  >
                    {PAYOUT_LABEL[payout.status] ?? payout.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </PanelShell>
  );
}

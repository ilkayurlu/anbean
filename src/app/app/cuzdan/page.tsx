import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { couriers, ledgerEntries } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { ensureWallet } from "@/lib/ledger";
import { formatTry } from "@/lib/pricing";
import { STATUS_COLOR } from "@/lib/status";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import TopUpForm from "@/components/TopUpForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Platform bakiyesi — Anbean" };

const KIND_LABEL: Record<string, string> = {
  deposit: "Bakiye yükleme",
  ride_charge: "Sürüş ücreti",
  shipment_charge: "Gönderi ücreti",
  guarantee_refund: "Teslimat Güvencesi iadesi",
  courier_payout: "Saha görevi hakedişi",
  reversal: "Ters kayıt",
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function WalletPage() {
  const user = await requireRole(["musteri", "kurye", "ops", "admin"]);
  if (!user) redirect("/giris");

  // Kurye hakedişleri ayrı cüzdanda; diğer roller kullanıcı cüzdanını görür.
  const courierRows =
    user.role === "kurye" ? await db.select().from(couriers).where(eq(couriers.userId, user.id)).limit(1) : [];
  const isCourierWallet = courierRows.length > 0;
  const wallet = isCourierWallet
    ? await ensureWallet("courier", courierRows[0].id)
    : await ensureWallet("user", user.id);

  const entries = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.walletId, wallet.id))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(30);

  const spent = entries.filter((e) => e.side === "debit").reduce((sum, e) => sum + e.amountKurus, 0);
  const refunded = entries
    .filter((e) => e.kind === "guarantee_refund" && e.side === "credit")
    .reduce((sum, e) => sum + e.amountKurus, 0);
  const earned = entries
    .filter((e) => e.kind === "courier_payout" && e.side === "credit")
    .reduce((sum, e) => sum + e.amountKurus, 0);

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Platform bakiyesi"
      subtitle={
        isCourierWallet
          ? "Saha görevi hakedişlerin. Her hareket çift taraflı kayıtla yazılır ve silinemez."
          : "Sipariş, gönderi, sürüş ve güvence iadeleri tek bakiyede. Her hareket çift taraflı kayıtla yazılır ve silinemez."
      }
      nav={[
        { href: "/app", label: "Gönderilerim" },
        { href: "/app/cuzdan", label: "Bakiye" },
        { href: "/filo-haritasi", label: "Araç bul" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Bakiye"
          value={formatTry(wallet.balanceKurus)}
          tone={wallet.balanceKurus < 0 ? STATUS_COLOR.risk : "#0B1220"}
        />
        {isCourierWallet ? (
          <Metric label="Hakediş (son 30 hareket)" value={formatTry(earned)} tone={STATUS_COLOR.delivered} />
        ) : (
          <Metric label="Harcanan (son 30 hareket)" value={formatTry(spent)} />
        )}
        <Metric label="Güvence iadeleri" value={formatTry(refunded)} tone={STATUS_COLOR.delivered} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        {isCourierWallet ? (
          <Card title="Hakediş">
            <p className="text-sm text-slate-600">
              Hakediş, saha görevini sahiplendiğin an bu cüzdana geçer. Bankaya çıkış (payout) bu sürümde yok.
            </p>
          </Card>
        ) : (
          <Card title="Bakiye yükle">
            <p className="mb-4 rounded-md border border-st-waiting/40 bg-st-waiting/10 p-3 text-xs text-slate-700">
              <strong>Hukuki not:</strong> ödeme kuruluşu modeli kesinleşmediği için bu bakiye &quot;elektronik para
              cüzdanı&quot; olarak sunulmaz. Gerçek ödeme sağlayıcısı bağlı değildir; yükleme simülasyondur.
            </p>
            <TopUpForm />
            {wallet.balanceKurus < 0 ? (
              <p className="mt-3 text-sm text-st-risk">
                Bakiye eksi: yeni sürüş başlatmak için önce bakiye yükle.
              </p>
            ) : null}
          </Card>
        )}

        <Card title="Hareketler">
          {entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Henüz hareket yok.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{KIND_LABEL[entry.kind] ?? entry.kind}</p>
                    <p className="truncate text-xs text-slate-500">
                      {entry.note || entry.reason} · {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 font-display text-sm font-bold tabular-nums"
                    style={{ color: entry.side === "credit" ? "#15803d" : "#0B1220" }}
                  >
                    {entry.side === "credit" ? "+" : "−"}
                    {formatTry(entry.amountKurus)}
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

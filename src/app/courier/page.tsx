import { redirect } from "next/navigation";
import { db } from "@/db";
import { shipments, couriers, fieldTasks, wallets, ledgerEntries } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import StatusStrip, { StatusPill } from "@/components/StatusStrip";
import CourierTaskActions from "@/components/CourierTaskActions";
import FieldTaskCard from "@/components/FieldTaskCard";
import { STATUS_COLOR } from "@/lib/status";
import { formatTry } from "@/lib/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Görevlerim — Anbean Kurye" };

export default async function CourierPanel() {
  const user = await requireRole(["kurye", "admin"]);
  if (!user) redirect("/giris");

  const [courier] = await db.select().from(couriers).where(eq(couriers.userId, user.id)).limit(1);
  const courierWallet = courier ? await ensureCourierWallet(courier.id) : null;
  const recentEntries = courierWallet
    ? await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.walletId, courierWallet.id))
        .orderBy(desc(ledgerEntries.createdAt))
        .limit(10)
    : [];

  const tasks = courier
    ? await db.select().from(shipments).where(eq(shipments.assignedCourierId, courier.id)).orderBy(desc(shipments.updatedAt))
    : [];

  // Açık saha görevleri — kurye teslimat yapmadığında alır.
  const openFieldTasks = await db.select().from(fieldTasks).where(eq(fieldTasks.status, "acik"));
  const myFieldTasks = courier
    ? await db.select().from(fieldTasks).where(eq(fieldTasks.assignedCourierId, courier.id))
    : [];

  const open = tasks.filter((t) => !["teslim_edildi", "iade_edildi", "iptal", "arsivlendi"].includes(t.status));
  const done = tasks.filter((t) => t.status === "teslim_edildi");

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Görevlerim"
      subtitle={courier ? `${courier.city} · ${courier.vehicle} · ${courier.status}` : "Kurye profili bulunamadı"}
      nav={[
        { href: "/courier", label: "Görevler" },
        { href: "/courier/kazanc", label: "Kazanç" },
        { href: "/app/destek", label: "Destek" },
        { href: "/filo-haritasi", label: "Filo haritası" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Açık görev" value={String(open.length)} tone={STATUS_COLOR.transit} />
        <Metric label="Bugün teslim" value={String(done.length)} tone={STATUS_COLOR.delivered} />
        <Metric label="Açık saha görevi" value={String(openFieldTasks.length)} tone={STATUS_COLOR.return} />
        <Metric
          label="Hakediş bakiye"
          value={courierWallet ? formatTry(courierWallet.balanceKurus) : "—"}
          tone="var(--accent)"
        />
      </div>

      {/* Teslimat görevleri */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {open.length === 0 ? (
          <Card title="Teslimat görevleri">
            <p className="py-8 text-center text-sm text-slate-500">
              Teslimat yok. Aşağıdaki saha görevlerinden birini alarak ölü saati doldur.
            </p>
          </Card>
        ) : (
          open.map((task) => (
            <Card key={task.id}>
              <div className="flex items-center justify-between">
                <p className="font-display text-base font-bold text-[#0B1220]">{task.code}</p>
                <StatusPill status={task.status} />
              </div>
              <StatusStrip status={task.status} size="md" className="mt-4" />
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Alım</dt>
                  <dd className="text-slate-800">{task.pickupDistrict}</dd>
                  <dd className="text-xs text-slate-500">{task.pickupAddress}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.1em] text-slate-500">Teslim</dt>
                  <dd className="text-slate-800">{task.dropDistrict}</dd>
                  <dd className="text-xs text-slate-500">{task.dropAddress}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">
                {(task.weightGrams / 1000).toFixed(1)} kg · {task.distanceKm.toFixed(1)} km · {task.tariffCode}
              </p>
              <CourierTaskActions shipmentId={task.id} status={task.status} />
            </Card>
          ))
        )}
      </div>

      {/* Saha görevleri (Moat #2 — Hibrit Filo) */}
      <div className="mt-6">
        <Card
          title="Hibrit filo görevleri — ölü saati sıfırla"
          action={
            <span className="text-xs text-slate-500">
              {openFieldTasks.length} açık · {myFieldTasks.filter((t) => t.status === "atandi").length} sana atandı
            </span>
          }
        >
          <p className="mb-4 text-sm text-slate-600">
            Teslimat olmadığı saatlerde batarya değişimi veya arızalı araç toplama yaparak ek gelir kazanırsın.
            Hakediş görev sahiplenildiği an cüzdanına yansır.
          </p>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {openFieldTasks.map((task) => (
              <FieldTaskCard key={task.id} task={task} />
            ))}
            {openFieldTasks.length === 0 ? (
              <p className="col-span-full py-6 text-center text-sm text-slate-500">
                Şu an açık saha görevi yok.
              </p>
            ) : null}
          </div>
        </Card>
      </div>

      {/* Hakediş hareketleri */}
      {recentEntries.length > 0 ? (
        <div className="mt-6">
          <Card title="Hakediş dökümü (çift taraflı ledger)">
            <ul className="divide-y divide-slate-100 text-sm">
              {recentEntries.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-slate-800">{e.reason}</p>
                    <p className="text-xs text-slate-500">
                      {e.kind} · {new Date(e.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  <span
                    className="font-display text-sm font-bold tabular-nums"
                    style={{ color: e.side === "credit" ? STATUS_COLOR.delivered : STATUS_COLOR.risk }}
                  >
                    {e.side === "credit" ? "+" : "-"}
                    {formatTry(e.amountKurus)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Her kayıt dengeli karşı kayıt ile yazılmıştır; kayıt silinmez, hatalar ters kayıt ile düzeltilir.
            </p>
          </Card>
        </div>
      ) : null}
    </PanelShell>
  );
}

async function ensureCourierWallet(courierId: number) {
  const existing = await db
    .select()
    .from(wallets)
    .where(eq(wallets.ownerId, courierId))
    .catch(() => []);
  const mine = existing.find((w) => w.ownerKind === "courier");
  if (mine) return mine;
  const [row] = await db.insert(wallets).values({ ownerKind: "courier", ownerId: courierId }).returning();
  return row;
}

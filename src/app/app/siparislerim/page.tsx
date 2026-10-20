import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, restaurants, shipments } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import PanelShell, { Card, Metric } from "@/components/PanelShell";
import StatusStrip, { StatusPill } from "@/components/StatusStrip";
import { STATE_COPY } from "@/lib/content";
import { formatTry } from "@/lib/pricing";
import { STATUS_COLOR } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Siparişlerim — Anbean" };

const NAV = [
  { href: "/app", label: "Gönderilerim" },
  { href: "/app/siparislerim", label: "Siparişlerim" },
  { href: "/app/suruslerim", label: "Sürüşlerim" },
  { href: "/app/cuzdan", label: "Bakiye" },
  { href: "/app/destek", label: "Destek" },
];

export default async function SiparislerimPage() {
  const user = await requirePermission("shipment:read");
  if (!user) redirect("/giris");

  const rows = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  const venues = await db.select().from(restaurants);
  const venueById = new Map(venues.map((venue) => [venue.id, venue]));

  const itemRows = rows.length
    ? await db.select().from(orderItems)
    : [];
  const itemsByOrder = new Map<number, typeof itemRows>();
  for (const item of itemRows) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  const shipmentRows = rows.length
    ? await db.select().from(shipments).where(eq(shipments.createdByUserId, user.id))
    : [];
  const shipmentById = new Map(shipmentRows.map((s) => [s.id, s]));

  const spent = rows.reduce((sum, row) => sum + row.totalKurus, 0);
  const delivered = rows.filter((row) => row.status === "teslim_edildi").length;

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Siparişlerim"
      subtitle="Yemek siparişleri de kurye gönderileriyle aynı durum şeridini kullanır."
      nav={NAV}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Sipariş" value={String(rows.length)} />
        <Metric label="Teslim edilen" value={String(delivered)} tone={STATUS_COLOR.delivered} />
        <Metric label="Toplam harcama" value={formatTry(spent)} />
      </div>

      <div className="mt-6">
        <Card
          title="Sipariş geçmişi"
          action={
            <Link href="/yemek" className="rounded-md bg-accent px-3.5 py-2 text-xs font-semibold text-[#0B1220]">
              Yeni sipariş
            </Link>
          }
        >
          {rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-700">{STATE_COPY.emptyOrders.title}</p>
              <p className="mt-1 text-sm text-slate-500">{STATE_COPY.emptyOrders.body}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((order) => {
                const venue = venueById.get(order.restaurantId);
                const shipment = order.shipmentId ? shipmentById.get(order.shipmentId) : undefined;
                const items = itemsByOrder.get(order.id) ?? [];
                return (
                  <li key={order.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-bold text-[#0B1220]">
                          {order.code} · {venue?.name ?? "İşletme"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleString("tr-TR")} · {order.district} ·{" "}
                          {formatTry(order.totalKurus)}
                          {order.discountKurus > 0 ? ` · indirim ${formatTry(order.discountKurus)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {shipment ? <StatusPill status={shipment.status} /> : <StatusPill status={order.status} />}
                        {order.trackingToken ? (
                          <Link
                            href={`/takip/${order.trackingToken}`}
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600"
                          >
                            Takip
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    {shipment ? <StatusStrip status={shipment.status} size="sm" className="mt-3" /> : null}
                    {items.length > 0 ? (
                      <ul className="mt-3 space-y-1 text-xs text-slate-600">
                        {items.map((item) => (
                          <li key={item.id}>
                            {item.quantity} × {item.name} — {formatTry(item.unitPriceKurus * item.quantity)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </PanelShell>
  );
}

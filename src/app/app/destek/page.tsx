import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { shipments, supportTickets } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import PanelShell from "@/components/PanelShell";
import { SupportDesk } from "@/components/SupportPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Destek — Anbean" };

export default async function DestekPage() {
  const user = await requireAuth();
  if (!user) redirect("/giris");

  const canManage = hasPermission(user.role, "support:manage");
  const tickets = canManage
    ? await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt)).limit(100)
    : await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.userId, user.id))
        .orderBy(desc(supportTickets.createdAt));

  // Yalnızca kendi gönderileri ilişkilendirilebilir (tenant izolasyonu).
  const ownShipments = await db
    .select({ id: shipments.id, code: shipments.code })
    .from(shipments)
    .where(user.orgId ? eq(shipments.orgId, user.orgId) : eq(shipments.createdByUserId, user.id))
    .orderBy(desc(shipments.createdAt));

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Destek taleplerim"
      subtitle="Teslimat, ödeme ve araç sorunları. Görüşmeler denetim kaydına işlenir."
      nav={[
        { href: "/app", label: "Gönderilerim" },
        { href: "/app/cuzdan", label: "Bakiye" },
        { href: "/app/destek", label: "Destek" },
      ]}
    >
      <SupportDesk tickets={tickets} shipments={ownShipments} canManage={false} />
    </PanelShell>
  );
}

import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { supportTickets, users } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import PanelShell, { Metric } from "@/components/PanelShell";
import { SupportDesk, type TicketRow } from "@/components/SupportPanel";
import { STATUS_COLOR } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Destek kuyruğu — Anbean" };

export default async function AdminDestekPage() {
  // support:manage → destek ekibi, ops ve admin. 'musteri' ve 'kurye' giremez.
  const user = await requirePermission("support:manage");
  if (!user) redirect("/giris");

  const tickets = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt)).limit(200);
  const authors = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const nameById = new Map(authors.map((a) => [a.id, a.fullName]));

  const rows: TicketRow[] = tickets.map((t) => ({ ...t, ownerName: nameById.get(t.userId) ?? "—" }));
  const open = rows.filter((t) => t.status === "acik").length;
  const inProgress = rows.filter((t) => t.status === "isleniyor").length;
  const resolved = rows.filter((t) => t.status === "cozuldu").length;

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Destek kuyruğu"
      subtitle="Tüm talepler. Yanıt yazınca talep otomatik 'işleniyor'a geçer."
      nav={[
        { href: "/admin", label: "Yönetim" },
        { href: "/admin/destek", label: "Destek" },
        { href: "/admin/finans", label: "Finans" },
        { href: "/ops", label: "Dispatch" },
      ]}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Açık" value={String(open)} tone={STATUS_COLOR.waiting} />
        <Metric label="İşleniyor" value={String(inProgress)} tone={STATUS_COLOR.transit} />
        <Metric label="Çözüldü" value={String(resolved)} tone={STATUS_COLOR.delivered} />
      </div>
      <div className="mt-6">
        <SupportDesk tickets={rows} shipments={[]} canManage />
      </div>
    </PanelShell>
  );
}

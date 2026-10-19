import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { restaurantApplications } from "@/db/schema";
import PanelShell from "@/components/PanelShell";
import PartnerReviewQueue, { type PartnerApplicationRow } from "@/components/PartnerReviewQueue";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Restoran başvuruları — Anbean" };

export default async function RestaurantApplicationsAdminPage() {
  const user = await requireRole(["admin"]);
  if (!user) redirect("/giris");

  const rows = await db.select().from(restaurantApplications).orderBy(desc(restaurantApplications.createdAt)).limit(200);
  const applications: PartnerApplicationRow[] = rows.map((row) => ({
    id: row.id,
    businessName: row.businessName,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    city: row.city,
    district: row.district,
    status: row.status,
    reviewReason: row.reviewReason,
    createdAt: row.createdAt.toISOString(),
    details: [
      `Adres: ${row.address}`,
      `Mutfak / kategori: ${row.cuisine}`,
      `Web sitesi: ${row.website || "Belirtilmedi"}`,
      `Çalışma saatleri: ${row.openingHours || "Belirtilmedi"}`,
      `Ticari ileti izni: ${row.communicationConsent ? "Verildi" : "Verilmedi"}`,
    ],
  }));

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Restoran başvuruları"
      subtitle="Başvurular ve iletişim bilgileri yalnızca yönetici yetkisiyle görüntülenir."
      nav={[
        { href: "/admin", label: "Yönetim" },
        { href: "/admin/basvurular/restoranlar", label: "Restoran başvuruları" },
        { href: "/admin/basvurular/filolar", label: "Filo başvuruları" },
      ]}
    >
      <PartnerReviewQueue kind="restaurant" applications={applications} />
    </PanelShell>
  );
}

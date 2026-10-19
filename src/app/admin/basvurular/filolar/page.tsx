import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { fleetApplications } from "@/db/schema";
import PanelShell from "@/components/PanelShell";
import PartnerReviewQueue, { type PartnerApplicationRow } from "@/components/PartnerReviewQueue";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Filo başvuruları — Anbean" };

export default async function FleetApplicationsAdminPage() {
  const user = await requireRole(["admin"]);
  if (!user) redirect("/giris");

  const rows = await db.select().from(fleetApplications).orderBy(desc(fleetApplications.createdAt)).limit(200);
  const applications: PartnerApplicationRow[] = rows.map((row) => ({
    id: row.id,
    businessName: row.companyName,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    city: "",
    district: "",
    status: row.status,
    reviewReason: row.reviewReason,
    createdAt: row.createdAt.toISOString(),
    details: [
      `Hizmet türleri: ${row.serviceTypes.join(", ")}`,
      `Bölgeler: ${row.regions.join(", ")}`,
      `Araç sayısı: ${row.vehicleCountRange}`,
      `Web sitesi: ${row.website || "Belirtilmedi"}`,
      `Referanslar: ${row.references || "Belirtilmedi"}`,
      `Ticari ileti izni: ${row.communicationConsent ? "Verildi" : "Verilmedi"}`,
    ],
  }));

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Filo başvuruları"
      subtitle="Başvurular ve iletişim bilgileri yalnızca yönetici yetkisiyle görüntülenir."
      nav={[
        { href: "/admin", label: "Yönetim" },
        { href: "/admin/basvurular/restoranlar", label: "Restoran başvuruları" },
        { href: "/admin/basvurular/filolar", label: "Filo başvuruları" },
      ]}
    >
      <PartnerReviewQueue kind="fleet" applications={applications} />
    </PanelShell>
  );
}

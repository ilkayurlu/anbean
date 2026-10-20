import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import PanelShell from "@/components/PanelShell";
import NewShipmentForm from "@/components/NewShipmentForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Yeni gönderi — Anbean" };

export default async function NewShipmentPage() {
  const user = await requireRole(["musteri", "ops", "admin"]);
  if (!user) redirect("/giris");

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Yeni gönderi"
      subtitle="Fiyat yazarken güncellenir; kayıt anında sunucuda doğrulanır."
      nav={[
        { href: "/app", label: "Gönderilerim" },
        { href: "/app/yeni", label: "Yeni gönderi" },
        { href: "/fiyat-al", label: "Fiyat hesapla" },
      ]}
    >
      <NewShipmentForm />
    </PanelShell>
  );
}

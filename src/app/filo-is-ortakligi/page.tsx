import PageShell from "@/components/PageShell";
import PartnerApplicationForm from "@/components/PartnerApplicationForm";

export const metadata = { title: "Filo iş ortaklığı — Anbean" };

export default function FleetApplicationPage() {
  return (
    <PageShell
      eyebrow="İş ortaklığı · filo"
      title="Filonla Anbean’a katıl"
      lead="Hizmet alanlarını ve filo kapasiteni paylaş. Başvurun incelenir; onay ve hesap eşleştirmesi tamamlanmadan sisteme erişim verilmez."
    >
      <div className="max-w-3xl">
        <PartnerApplicationForm kind="fleet" />
      </div>
    </PageShell>
  );
}

import PageShell from "@/components/PageShell";
import PartnerApplicationForm from "@/components/PartnerApplicationForm";

export const metadata = { title: "Restoran iş ortaklığı — Anbean" };

export default function RestaurantApplicationPage() {
  return (
    <PageShell
      eyebrow="İş ortaklığı · restoran"
      title="Restoranını Anbean’a taşı"
      lead="İşletme bilgilerini gönder. Başvurular ekibimiz tarafından incelenir; onaylanmadan panel erişimi açılmaz."
    >
      <div className="max-w-3xl">
        <PartnerApplicationForm kind="restaurant" />
      </div>
    </PageShell>
  );
}

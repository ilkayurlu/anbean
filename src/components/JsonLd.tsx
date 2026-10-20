import { BRAND } from "@/lib/brand";

/**
 * schema.org yapısal verisi.
 * SADECE doğrulanmış bilgi: Organization ve WebSite.
 * Restaurant/MenuItem/LocalBusiness BİLİNÇLİ olarak üretilmiyor — katalog
 * demo verisi olduğu için sahte işletme structured data anlamına gelirdi.
 * FAQPage yalnızca gerçek SSS içeriğiyle kullanılıyor (rating/price yok).
 */
export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: BRAND.name,
          legalName: BRAND.legalName,
          url: `https://${BRAND.domain}`,
          email: BRAND.support.email,
          telephone: BRAND.support.phone,
          address: {
            "@type": "PostalAddress",
            streetAddress: "Caferağa Mah. Moda Cad. No:12 K:3",
            addressLocality: "Kadıköy",
            addressRegion: "İstanbul",
            addressCountry: "TR",
          },
        }),
      }}
    />
  );
}

export function WebSiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: BRAND.name,
          url: `https://${BRAND.domain}`,
          inLanguage: "tr-TR",
          publisher: { "@type": "Organization", name: BRAND.name },
        }),
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      }}
    />
  );
}

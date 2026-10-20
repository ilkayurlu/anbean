import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// Fontlar npm'den, kendi sunucumuzdan: build sırasında Google Fonts'a ağ isteği yok.
// (next/font/google, platform build'inde font URL ayrıştırma hatasıyla düştü.)
// Her iki paket latin + latin-ext alt kümelerini unicode-range ile ayırır;
// ş, ğ, İ latin-ext'te — tarayıcı yalnızca ihtiyaç duyduğu dosyayı indirir.
import "@fontsource-variable/sora";
import "@fontsource-variable/plus-jakarta-sans";
import ModeProvider from "@/components/ModeProvider";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/JsonLd";
import { BRAND } from "@/lib/brand";
import MobileNav from "@/components/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BRAND.domain}`),
  title: { default: `${BRAND.name} — ${BRAND.idea}`, template: `%s — ${BRAND.name}` },
  description: BRAND.supportingLine,
  applicationName: BRAND.name,
  keywords: ["yemek siparişi", "şehir içi kurye", "elektrikli scooter kiralama", "canlı takip", "İstanbul"],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.idea}`,
    description: BRAND.supportingLine,
    url: `https://${BRAND.domain}`,
  },
  twitter: { card: "summary_large_image", title: `${BRAND.name}`, description: BRAND.supportingLine },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-deep text-slate-200 antialiased">
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {/* Yalnızca doğrulanmış bilgi: Organization + WebSite. Demo katalog için
            Restaurant/MenuItem structured data üretilmiyor. */}
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <ModeProvider>
          {children}
          <MobileNav />
        </ModeProvider>
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

const BASE = "https://anbean.com.tr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Panel ve API yüzeyleri indekslenmez: oturum gerektirir, PII taşır.
        disallow: ["/app", "/ops", "/admin", "/courier", "/hesap", "/api", "/giris", "/kayit", "/sifremi-unuttum"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}

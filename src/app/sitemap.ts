import type { MetadataRoute } from "next";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { POLICIES } from "@/lib/policies";

const BASE = "https://anbean.com.tr";

/** Public rotalar. Panel rotaları (app/ops/admin/courier) bilinçli olarak yok. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/yemek",
    "/yolculuk",
    "/gonder",
 "/sepet",
    "/kurumsal",
    "/nasil-calisir",
    "/guvenlik",
    "/yardim",
    "/hakkimizda",
    "/surdurulebilirlik",
    "/fiyat-al",
    "/filo-haritasi",
    "/restoran-basvuru",
    "/filo-is-ortakligi",
    "/takip",
    "/kurye-basvur",
    "/sss",
    "/iletisim",
    "/blog",
    "/yasal",
  ];

  const venues = await db.select({ slug: restaurants.slug }).from(restaurants).catch(() => [] as { slug: string }[]);

  return [
    ...staticRoutes.map((path) => ({
      url: `${BASE}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...venues.map((venue) => ({
      url: `${BASE}/yemek/${venue.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...POLICIES.map((policy) => ({
      url: `${BASE}/yasal/${policy.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];
}

import { db } from "@/db";
import { shipments, shipmentEvents, trackingTokens, couriers, organizations, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { statusDef, type StatusKey } from "./status";

export const DEMO_TOKENS = {
  delivered: "K7M2QX9PLR4TBN",
  transit: "T3HD8NVZ5QWRKM",
  risk: "P9XCJ2LMB7YTDA",
};

type DemoSpec = {
  token: string;
  code: string;
  tariffCode: string;
  status: StatusKey;
  path: StatusKey[];
  pickupDistrict: string;
  dropDistrict: string;
  recipientName: string;
  priceKurus: number;
  courierName?: string;
};

const DEMOS: DemoSpec[] = [
  {
    token: DEMO_TOKENS.delivered,
    code: "AB-2026-001001",
    tariffCode: "sehir_ici",
    status: "teslim_edildi",
    path: ["alim_planlandi", "kurye_atandi", "gonderi_alindi", "aktarma_merkezinde", "dagitima_cikti", "teslim_edildi"],
    pickupDistrict: "Şişli",
    dropDistrict: "Kadıköy",
    recipientName: "Ayşe Korkmaz",
    priceKurus: 13400,
    courierName: "Mert Aksoy",
  },
  {
    token: DEMO_TOKENS.transit,
    code: "AB-2026-001002",
    tariffCode: "ekspres",
    status: "dagitima_cikti",
    path: ["alim_planlandi", "kurye_atandi", "gonderi_alindi", "dagitima_cikti"],
    pickupDistrict: "Beşiktaş",
    dropDistrict: "Üsküdar",
    recipientName: "Kerem Aydın",
    priceKurus: 22800,
    courierName: "Seda Kaya",
  },
  {
    token: DEMO_TOKENS.risk,
    code: "AB-2026-001003",
    tariffCode: "sehir_ici",
    status: "teslimat_denemesi_basarisiz",
    path: ["alim_planlandi", "kurye_atandi", "gonderi_alindi", "dagitima_cikti", "teslimat_denemesi_basarisiz"],
    pickupDistrict: "Kadıköy",
    dropDistrict: "Beylikdüzü",
    recipientName: "Zeynep Ulu",
    priceKurus: 19100,
    courierName: "Onur Şahin",
  },
];

let ran = false;

/** Uygulama ilk sağlık kontrolünde demo veriyi garanti eder. Idempotent. */
export async function ensureDemoData(): Promise<void> {
  if (ran) return;

  const [count] = await db.select({ n: sql<number>`count(*)` }).from(shipments);
  if (Number(count?.n ?? 0) > 0) {
    ran = true;
    return;
  }

  const [org] = await db.select().from(organizations).where(eq(organizations.slug, "moda-butik")).limit(1);
  const [owner] = await db.select().from(users).where(eq(users.email, "musteri@anbean.com.tr")).limit(1);
  const courierRows = await db.select().from(couriers);

  for (const demo of DEMOS) {
    const courier = courierRows.find((c) => c.fullName === demo.courierName);
    const [row] = await db
      .insert(shipments)
      .values({
        code: demo.code,
        orgId: org?.id ?? null,
        createdByUserId: owner?.id ?? null,
        tariffCode: demo.tariffCode,
        status: demo.status,
        financialStatus: demo.status === "teslim_edildi" ? "faturalandi" : "fatura_bekliyor",
        senderName: "Moda Butik",
        senderPhone: "05321110011",
        pickupCity: "İstanbul",
        pickupDistrict: demo.pickupDistrict,
        pickupAddress: `${demo.pickupDistrict} Mah. Tasarım Sok. No:12`,
        recipientName: demo.recipientName,
        recipientPhone: "05339990099",
        dropCity: "İstanbul",
        dropDistrict: demo.dropDistrict,
        dropAddress: `${demo.dropDistrict} Mah. Çınar Cad. No:48 D:5`,
        weightGrams: 1800,
        distanceKm: 11.4,
        priceKurus: demo.priceKurus,
        assignedCourierId: courier?.id ?? null,
        etaAt: new Date(Date.now() + 75 * 60_000),
        deliveredAt: demo.status === "teslim_edildi" ? new Date(Date.now() - 40 * 60_000) : null,
      })
      .returning();

    await db.insert(trackingTokens).values({ token: demo.token, shipmentId: row.id });

    const step = 42;
    for (let i = 0; i < demo.path.length; i += 1) {
      const status = demo.path[i];
      await db.insert(shipmentEvents).values({
        shipmentId: row.id,
        status,
        note: statusDef(status).publicNote,
        district: i < 2 ? demo.pickupDistrict : demo.dropDistrict,
        actorRole: i === 0 ? "sistem" : "kurye",
        createdAt: new Date(Date.now() - (demo.path.length - i) * step * 60_000),
      });
    }
  }

  ran = true;
}

import { db } from "@/db";
import { tariffs, serviceZones } from "@/db/schema";
import { eq } from "drizzle-orm";

export type QuoteInput = {
  tariffCode: string;
  distanceKm: number;
  weightGrams: number;
  dropDistrict?: string;
};

export type QuoteResult = {
  tariffCode: string;
  tariffName: string;
  baseKurus: number;
  distanceKurus: number;
  weightKurus: number;
  zoneSurchargeKurus: number;
  totalKurus: number;
  slaMinutes: number;
  breakdown: { label: string; kurus: number }[];
};

export function formatTry(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(kurus / 100);
}

/**
 * Fiyat yalnızca sunucuda hesaplanır. İstemciden gelen tutar hiçbir
 * koşulda kabul edilmez (Faz 4 kabul kriteri).
 */
export async function calculateQuote(input: QuoteInput): Promise<QuoteResult> {
  const code = ["sehir_ici", "ekspres", "kurumsal"].includes(input.tariffCode)
    ? input.tariffCode
    : "sehir_ici";

  const rows = await db.select().from(tariffs).where(eq(tariffs.code, code)).limit(1);
  const tariff = rows[0];
  if (!tariff) throw new Error("Tarife bulunamadı");

  const km = Math.min(Math.max(Number(input.distanceKm) || 1, 1), 120);
  const kg = Math.min(Math.max((Number(input.weightGrams) || 500) / 1000, 0.1), 50);

  let zoneSurchargeKurus = 0;
  if (input.dropDistrict) {
    const zones = await db
      .select()
      .from(serviceZones)
      .where(eq(serviceZones.district, input.dropDistrict))
      .limit(1);
    zoneSurchargeKurus = zones[0]?.surchargeKurus ?? 0;
  }

  const distanceKurus = Math.round(km * tariff.perKmKurus);
  const weightKurus = Math.round(Math.max(kg - 1, 0) * tariff.perKgKurus);
  const totalKurus = tariff.baseKurus + distanceKurus + weightKurus + zoneSurchargeKurus;

  return {
    tariffCode: tariff.code,
    tariffName: tariff.name,
    baseKurus: tariff.baseKurus,
    distanceKurus,
    weightKurus,
    zoneSurchargeKurus,
    totalKurus,
    slaMinutes: tariff.slaMinutes,
    breakdown: [
      { label: "Taban ücret", kurus: tariff.baseKurus },
      { label: `Mesafe (${km.toFixed(1)} km)`, kurus: distanceKurus },
      { label: `Ağırlık (${kg.toFixed(1)} kg)`, kurus: weightKurus },
      { label: "Bölge farkı", kurus: zoneSurchargeKurus },
    ],
  };
}

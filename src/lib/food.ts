import { db } from "@/db";
import { coupons, menuItems, orderItems, restaurants, serviceZones, shipments, trackingTokens } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { formatTry } from "./pricing";
import { newTrackingToken } from "./shipments";

/**
 * YEMEK SEPETİ VE ÜCRET MOTORU
 *
 * Kurallar:
 *  - Tüm tutarlar SUNUCUDA hesaplanır; istemciden gelen toplam yok sayılır.
 *  - Fiyat/stok değişiminde kullanıcıdan yeniden onay istenir (acknowledgedPrices).
 *  - İşletmeler arası sepet birleştirilmez: tek sepet = tek işletme.
 *  - Onay öncesi sürpriz ücret yok: her kalem ayrı satırda gösterilir.
 */

export type CartLine = { menuItemId: number; quantity: number };

export type CartIssue =
  | { code: "empty_cart"; message: string }
  | { code: "venue_closed"; message: string }
  | { code: "out_of_zone"; message: string }
  | { code: "item_unavailable"; menuItemId: number; name: string; message: string }
  | { code: "item_missing"; menuItemId: number; message: string }
  | { code: "price_changed"; menuItemId: number; name: string; expectedKurus: number; actualKurus: number; message: string }
  | { code: "below_minimum"; minKurus: number; subtotalKurus: number; message: string }
  | { code: "coupon_invalid"; reason: string; message: string }
  | { code: "mixed_venues"; message: string };

export type CartTotals = {
  subtotalKurus: number;
  discountKurus: number;
  deliveryFeeKurus: number;
  zoneSurchargeKurus: number;
  serviceFeeKurus: number;
  smallBasketFeeKurus: number;
  tipKurus: number;
  totalKurus: number;
};

export type CartLineView = {
  menuItemId: number;
  name: string;
  unitPriceKurus: number;
  quantity: number;
  lineTotalKurus: number;
  available: boolean;
};

export type CartEvaluation = {
  restaurant: {
    id: number;
    slug: string;
    name: string;
    isOpen: boolean;
    isDemo: boolean;
    note: string;
    prepMinutes: number;
    minBasketKurus: number;
  };
  lines: CartLineView[];
  totals: CartTotals;
  coupon: { code: string; label: string } | null;
  issues: CartIssue[];
  /** Sorun yoksa sipariş verilebilir. */
  canCheckout: boolean;
  breakdown: { label: string; kurus: number; sign: "plus" | "minus" }[];
};

export const TIP_PRESETS_KURUS = [0, 1000, 2000, 5000];

/** Pilot işletmelerin alım ilçesi — kurgusal adres üretilmez, sabit eşleme. */
export const VENUE_DISTRICT: Record<string, string> = {
  "pilot-firin-modal": "Kadıköy",
  "pilot-esnaf-lokantasi": "Kadıköy",
  "pilot-vegan-mutfak": "Beşiktaş",
};
const MAX_QUANTITY = 20;

function money(kurus: number) {
  return formatTry(kurus);
}

export async function evaluateCart(args: {
  restaurantSlug: string;
  lines: CartLine[];
  district: string;
  couponCode?: string;
  tipKurus?: number;
  acknowledgedPrices?: Record<string, number>;
}): Promise<CartEvaluation | { error: string }> {
  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.slug, args.restaurantSlug)).limit(1);
  if (!restaurant) return { error: "İşletme bulunamadı" };

  const issues: CartIssue[] = [];
  const lines: CartLineView[] = [];

  // Bölge uygunluğu: hizmet bölgeleri tablosundan gerçek kayıt okunur.
  const zoneRows = await db.select().from(serviceZones).where(eq(serviceZones.district, args.district)).limit(1);
  const inZone = zoneRows.length > 0;
  const zoneSurchargeKurus = zoneRows[0]?.surchargeKurus ?? 0;

  const normalized = (args.lines ?? [])
    .map((line) => ({
      menuItemId: Number(line.menuItemId),
      quantity: Math.min(Math.max(Math.round(Number(line.quantity) || 0), 0), MAX_QUANTITY),
    }))
    .filter((line) => Number.isFinite(line.menuItemId) && line.quantity > 0);

  if (normalized.length === 0) {
    issues.push({ code: "empty_cart", message: "Sepetin boş." });
  }

  const ids = normalized.map((line) => line.menuItemId);
  const items = ids.length
    ? await db.select().from(menuItems).where(and(eq(menuItems.restaurantId, restaurant.id), inArray(menuItems.id, ids)))
    : [];
  const itemById = new Map(items.map((item) => [item.id, item]));

  const acknowledged = args.acknowledgedPrices ?? {};

  let subtotalKurus = 0;
  for (const line of normalized) {
    const item = itemById.get(line.menuItemId);
    if (!item) {
      issues.push({
        code: "item_missing",
        menuItemId: line.menuItemId,
        message: "Bu ürün sepette bulunamadı veya başka bir işletmeye ait. Sepetler işletmeler arasında birleştirilemez.",
      });
      continue;
    }
    const lineTotal = item.priceKurus * line.quantity;
    subtotalKurus += lineTotal;
    lines.push({
      menuItemId: item.id,
      name: item.name,
      unitPriceKurus: item.priceKurus,
      quantity: line.quantity,
      lineTotalKurus: lineTotal,
      available: item.isAvailable,
    });

    if (!item.isAvailable) {
      issues.push({
        code: "item_unavailable",
        menuItemId: item.id,
        name: item.name,
        message: `${item.name} tükendi. Onayın olmadan yerine ürün eklenmez.`,
      });
    }

    const ack = acknowledged[String(item.id)];
    if (typeof ack === "number" && ack !== item.priceKurus) {
      issues.push({
        code: "price_changed",
        menuItemId: item.id,
        name: item.name,
        expectedKurus: ack,
        actualKurus: item.priceKurus,
        message: `${item.name} fiyatı ${money(ack)} → ${money(item.priceKurus)} olarak değişti. Devam etmek için onayla.`,
      });
    }
  }

  if (!restaurant.isOpen) {
    issues.push({ code: "venue_closed", message: `${restaurant.name} şu an kapalı.` });
  }
  if (!inZone) {
    issues.push({ code: "out_of_zone", message: `${args.district} hizmet bölgesi dışında.` });
  }

  // Kupon: tüm koşullar sunucuda doğrulanır.
  let discountKurus = 0;
  let couponView: { code: string; label: string } | null = null;
  const couponCode = (args.couponCode ?? "").trim().toUpperCase();
  if (couponCode) {
    const [coupon] = await db.select().from(coupons).where(eq(coupons.code, couponCode)).limit(1);
    const reject = (reason: string) =>
      issues.push({ code: "coupon_invalid", reason, message: `Kupon uygulanamadı: ${reason}` });

    if (!coupon) reject("kod bulunamadı");
    else if (!coupon.isActive) reject("kupon pasif");
    else if (coupon.validUntil && coupon.validUntil.getTime() < Date.now()) reject("kuponun süresi doldu");
    else if (coupon.restaurantId !== null && coupon.restaurantId !== restaurant.id) reject("bu işletmede geçerli değil");
    else if (subtotalKurus < coupon.minBasketKurus)
      reject(`en az ${money(coupon.minBasketKurus)} sepet tutarı gerekiyor`);
    else if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) reject("kullanım limiti doldu");
    else {
      discountKurus =
        coupon.kind === "yuzde"
          ? Math.min(subtotalKurus, Math.round((subtotalKurus * coupon.value) / 100))
          : Math.min(subtotalKurus, coupon.value);
      couponView = {
        code: coupon.code,
        label: coupon.kind === "yuzde" ? `%${coupon.value} indirim` : `${money(coupon.value)} indirim`,
      };
    }
  }

  const smallBasketFeeKurus =
    subtotalKurus > 0 && subtotalKurus < restaurant.minBasketKurus ? restaurant.smallBasketFeeKurus : 0;
  const tipKurus = Math.min(Math.max(Math.round(Number(args.tipKurus) || 0), 0), 100_000);
  const deliveryFeeKurus = restaurant.deliveryFeeKurus + zoneSurchargeKurus;
  const serviceFeeKurus = restaurant.serviceFeeKurus;

  const totals: CartTotals = {
    subtotalKurus,
    discountKurus,
    deliveryFeeKurus,
    zoneSurchargeKurus,
    serviceFeeKurus,
    smallBasketFeeKurus,
    tipKurus,
    totalKurus:
      subtotalKurus - discountKurus + deliveryFeeKurus + serviceFeeKurus + smallBasketFeeKurus + tipKurus,
  };

  if (subtotalKurus > 0 && subtotalKurus < restaurant.minBasketKurus) {
    issues.push({
      code: "below_minimum",
      minKurus: restaurant.minBasketKurus,
      subtotalKurus,
      message: `Minimum sepet tutarı ${money(restaurant.minBasketKurus)}; şu an ${money(subtotalKurus)}.`,
    });
  }

  const breakdown: CartEvaluation["breakdown"] = [
    { label: "Ürün toplamı", kurus: subtotalKurus, sign: "plus" },
    ...(discountKurus > 0 ? [{ label: `İndirim (${couponView?.code ?? ""})`, kurus: discountKurus, sign: "minus" as const }] : []),
    { label: "Teslimat bedeli", kurus: restaurant.deliveryFeeKurus, sign: "plus" },
    ...(zoneSurchargeKurus > 0
      ? [{ label: `Bölge farkı (${args.district})`, kurus: zoneSurchargeKurus, sign: "plus" as const }]
      : []),
    { label: "Hizmet bedeli", kurus: serviceFeeKurus, sign: "plus" },
    ...(smallBasketFeeKurus > 0 ? [{ label: "Küçük sepet bedeli", kurus: smallBasketFeeKurus, sign: "plus" as const }] : []),
    ...(tipKurus > 0 ? [{ label: "Bahşiş", kurus: tipKurus, sign: "plus" as const }] : []),
  ];

  return {
    restaurant: {
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
      isOpen: restaurant.isOpen,
      isDemo: restaurant.isDemo,
      note: restaurant.note,
      prepMinutes: restaurant.prepMinutes,
      minBasketKurus: restaurant.minBasketKurus,
    },
    lines,
    totals,
    coupon: couponView,
    issues,
    canCheckout: issues.length === 0,
    breakdown,
  };
}

/**
 * Siparişi kesinleştirir. Ücretler burada YENİDEN hesaplanır ve mevcut
 * gönderi altyapısına bağlanır: yemek teslimatı da Durum Renk Şeridi ile
 * takip edilir (ayrı bir takip sistemi kurulmaz).
 */
export async function placeOrder(args: {
  userId: number;
  orgId: number | null;
  evaluation: CartEvaluation;
  district: string;
  addressText: string;
  note: string;
  paymentMethod: "bakiye" | "fatura";
}): Promise<{ code: string; token: string; totalKurus: number; shipmentId: number }> {
  const { evaluation } = args;
  const year = new Date().getFullYear();
  const seq = String(Date.now()).slice(-6);
  const code = `SIP-${year}-${seq}`;

  const [shipment] = await db
    .insert(shipments)
    .values({
      code: `AB-${year}-${seq}`,
      orgId: args.orgId,
      createdByUserId: args.userId,
      tariffCode: "sehir_ici",
      status: "kurye_atamasi_bekliyor",
      financialStatus: args.paymentMethod === "bakiye" ? "odendi" : "fatura_bekliyor",
      senderName: evaluation.restaurant.name,
      senderPhone: "00000000000",
      pickupCity: "İstanbul",
      pickupDistrict: VENUE_DISTRICT[evaluation.restaurant.slug] ?? "Kadıköy",
      pickupAddress: `${evaluation.restaurant.name} (pilot mutfak)`,
      recipientName: "Sipariş sahibi",
      recipientPhone: "00000000000",
      dropCity: "İstanbul",
      dropDistrict: args.district,
      dropAddress: args.addressText.slice(0, 240),
      weightGrams: 1200,
      distanceKm: 4.5,
      priceKurus: evaluation.totals.totalKurus,
      notes: `Yemek siparişi ${code}${args.note ? ` · ${args.note.slice(0, 160)}` : ""}`,
      etaAt: new Date(Date.now() + (evaluation.restaurant.prepMinutes + 25) * 60_000),
    })
    .returning();

  const token = newTrackingToken();
  await db.insert(trackingTokens).values({ token, shipmentId: shipment.id });

  return { code, token, totalKurus: evaluation.totals.totalKurus, shipmentId: shipment.id };
}

export async function insertOrderItems(orderId: number, lines: CartLineView[]) {
  if (lines.length === 0) return;
  await db.insert(orderItems).values(
    lines.map((line) => ({
      orderId,
      menuItemId: line.menuItemId,
      name: line.name,
      unitPriceKurus: line.unitPriceKurus,
      quantity: line.quantity,
    })),
  );
}

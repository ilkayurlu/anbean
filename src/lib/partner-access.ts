import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fleetMembers, fleets, merchantMembers, merchants, restaurants } from "@/db/schema";

export async function getMerchantContext(userId: number) {
  const [row] = await db
    .select({
      merchantId: merchants.id,
      restaurantId: restaurants.id,
      restaurantSlug: restaurants.slug,
      restaurantName: restaurants.name,
    })
    .from(merchantMembers)
    .innerJoin(merchants, eq(merchantMembers.merchantId, merchants.id))
    .innerJoin(restaurants, eq(merchants.slug, restaurants.slug))
    .where(and(eq(merchantMembers.userId, userId), eq(merchants.status, "active")))
    .limit(1);
  return row ?? null;
}

export async function getFleetContext(userId: number) {
  const [row] = await db
    .select({
      fleetId: fleets.id,
      slug: fleets.slug,
      companyName: fleets.companyName,
    })
    .from(fleetMembers)
    .innerJoin(fleets, eq(fleetMembers.fleetId, fleets.id))
    .where(and(eq(fleetMembers.userId, userId), eq(fleets.status, "active")))
    .limit(1);
  return row ?? null;
}

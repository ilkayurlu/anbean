import { db } from "@/db";
import { courierRatings, couriers, shipments } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { requireRole, writeAudit } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Kurye şeffaflığı: yalnızca teslim edilmiş kendi gönderisi puanlanabilir. */
export async function POST(req: Request) {
  const user = await requireRole(["musteri", "admin"]);
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    shipmentId?: number;
    score?: number;
    comment?: string;
  };
  const shipmentId = Number(body.shipmentId);
  const score = Math.round(Number(body.score));

  if (!Number.isFinite(shipmentId) || !(score >= 1 && score <= 5)) {
    return Response.json({ error: "Puan 1 ile 5 arasında olmalı" }, { status: 400 });
  }

  const [shipment] = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  if (!shipment || shipment.status !== "teslim_edildi" || !shipment.assignedCourierId) {
    return Response.json({ error: "Bu gönderi henüz puanlanamaz" }, { status: 409 });
  }
  // Tenant kontrolü: başkasının gönderisi puanlanamaz.
  if (user.role !== "admin" && shipment.orgId !== user.orgId) {
    return Response.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const already = await db
    .select()
    .from(courierRatings)
    .where(and(eq(courierRatings.shipmentId, shipmentId)))
    .limit(1);
  if (already.length > 0) {
    return Response.json({ error: "Bu gönderi zaten puanlandı" }, { status: 409 });
  }

  await db.insert(courierRatings).values({
    courierId: shipment.assignedCourierId,
    shipmentId,
    score,
    comment: String(body.comment ?? "").slice(0, 300),
  });

  await db
    .update(couriers)
    .set({
      ratingSum: sql`${couriers.ratingSum} + ${score}`,
      ratingCount: sql`${couriers.ratingCount} + 1`,
    })
    .where(eq(couriers.id, shipment.assignedCourierId));

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "kurye_puanlandi",
    entity: "shipment",
    entityId: String(shipmentId),
    meta: { score },
  });

  return Response.json({ ok: true });
}

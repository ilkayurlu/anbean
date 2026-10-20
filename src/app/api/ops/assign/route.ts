import { db } from "@/db";
import { shipments, couriers, assignments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requirePermission, writeAudit } from "@/lib/auth";
import { transitionShipment } from "@/lib/shipments";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // İzin tabanlı: 'ops' rolü sevkiyat yetkisine sahiptir, 'finance'/'support' sahip değildir.
  const user = await requirePermission("shipment:assign");
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { shipmentId?: number; courierId?: number };
  const shipmentId = Number(body.shipmentId);
  const courierId = Number(body.courierId);
  if (!Number.isFinite(shipmentId) || !Number.isFinite(courierId)) {
    return Response.json({ error: "Eksik parametre" }, { status: 400 });
  }

  // Gönderi var mı? Bu kontrol olmadan assignments'a yazılan kayıt FK ihlali
  // verip 500'e düşüyordu; artık net 404 dönüyor.
  const [shipment] = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  if (!shipment) return Response.json({ error: "Gönderi bulunamadı" }, { status: 404 });
  if (["teslim_edildi", "iade_edildi", "iptal", "arsivlendi"].includes(shipment.status)) {
    return Response.json({ error: "Terminal durumdaki gönderiye kurye atanamaz." }, { status: 409 });
  }

  const [courier] = await db.select().from(couriers).where(eq(couriers.id, courierId)).limit(1);
  if (!courier || courier.status !== "aktif") {
    return Response.json({ error: "Kurye aktif değil" }, { status: 409 });
  }

  await db.update(shipments).set({ assignedCourierId: courierId, updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
  await db.insert(assignments).values({ shipmentId, courierId, status: "kabul", respondedAt: new Date() });
  await db.update(couriers).set({ activeLoad: sql`${couriers.activeLoad} + 1` }).where(eq(couriers.id, courierId));

  const result = await transitionShipment({
    shipmentId,
    to: "kurye_atandi",
    actorRole: user.role,
    actorId: user.id,
    note: `Kurye atandı: ${courier.fullName}`,
  });

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "kurye_atandi",
    entity: "shipment",
    entityId: String(shipmentId),
    meta: { courierId },
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: 409 });
  return Response.json({ ok: true });
}

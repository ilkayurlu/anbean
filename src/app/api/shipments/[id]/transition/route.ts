import { db } from "@/db";
import { shipments, couriers, assignments } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/auth";
import { transitionShipment } from "@/lib/shipments";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("shipment:update");
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 403 });

  const { id } = await ctx.params;
  const shipmentId = Number(id);
  if (!Number.isFinite(shipmentId)) return Response.json({ error: "Geçersiz kayıt" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { to?: string; note?: string };
  const to = String(body.to ?? "");

  // Kurye yalnızca kendisine atanmış gönderide işlem yapabilir.
  if (user.role === "kurye") {
    const [courier] = await db.select().from(couriers).where(eq(couriers.userId, user.id)).limit(1);
    if (!courier) return Response.json({ error: "Kurye profili yok" }, { status: 403 });
    const [own] = await db
      .select({ id: shipments.id })
      .from(shipments)
      .where(and(eq(shipments.id, shipmentId), eq(shipments.assignedCourierId, courier.id)))
      .limit(1);
    if (!own) return Response.json({ error: "Bu gönderi size atanmamış" }, { status: 403 });

    if (to === "teslim_edildi") {
      await db
        .update(assignments)
        .set({ status: "tamamlandi", respondedAt: new Date() })
        .where(and(eq(assignments.shipmentId, shipmentId), eq(assignments.courierId, courier.id)));
    }
  }

  const result = await transitionShipment({
    shipmentId,
    to,
    actorRole: user.role,
    actorId: user.id,
    note: body.note,
  });

  if (!result.ok) return Response.json({ error: result.error }, { status: 409 });
  return Response.json({ ok: true, status: result.shipment.status });
}

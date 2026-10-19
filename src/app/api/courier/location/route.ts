import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { couriers, fieldTasks, shipments } from "@/db/schema";
import { and, eq, ne, notInArray } from "drizzle-orm";
import { rateLimit, requireAuth, writeAudit } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const TERMINAL = ["teslim_edildi", "iade_edildi", "iptal", "arsivlendi"];

/**
 * Konum kabulü.
 * Faz 5 kabul kriteri: konum YALNIZCA aktif görevde alınır. Görevi olmayan
 * kuryenin konumu reddedilir ve denetime yazılır (arka plan izleme yok).
 */
export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli" }, { status: 401 });
  if (!hasPermission(user.role, "shipment:update")) {
    return Response.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`loc:${user.id}`, 60, 60_000)) {
    return Response.json({ error: "Konum isteği sınırı aşıldı." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Geçersiz koordinat" }, { status: 400 });

  const [courier] = await db.select().from(couriers).where(eq(couriers.userId, user.id)).limit(1);
  if (!courier) return Response.json({ error: "Kurye profili bulunamadı" }, { status: 403 });

  const openShipments = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(and(eq(shipments.assignedCourierId, courier.id), notInArray(shipments.status, TERMINAL)))
    .limit(1);
  const hasOpenShipment = openShipments.length > 0;

  const openTasks = await db
    .select({ id: fieldTasks.id })
    .from(fieldTasks)
    .where(and(eq(fieldTasks.assignedCourierId, courier.id), ne(fieldTasks.status, "tamamlandi")))
    .limit(1);

  if (!hasOpenShipment && openTasks.length === 0) {
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "konum_reddedildi_gorev_yok",
      entity: "courier",
      entityId: String(courier.id),
    });
    return Response.json({ error: "Aktif göreviniz yokken konum gönderilemez." }, { status: 403 });
  }

  await db
    .update(couriers)
    .set({ lastLat: parsed.data.lat, lastLng: parsed.data.lng, lastSeenAt: new Date() })
    .where(eq(couriers.id, courier.id));

  return Response.json({ ok: true });
}

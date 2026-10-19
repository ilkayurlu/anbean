import { db } from "@/db";
import { shipments, slaCredits, tariffs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission, writeAudit } from "@/lib/auth";
import { transitionShipment } from "@/lib/shipments";
import { evaluateGuarantee } from "@/lib/guarantee";

export const dynamic = "force-dynamic";

/**
 * Tek tıkla istisna çözümü — 5 dakikalık çözüm taahhüdünün motoru.
 * Operatör kararı veriyor, sistem geçişi + krediyi birlikte işliyor.
 */
const ACTIONS: Record<string, { to: string; note: string }> = {
  yeniden_planla: { to: "yeniden_planlandi", note: "Operasyon teslimatı yeniden planladı." },
  iade_baslat: { to: "iade_surecinde", note: "İade süreci operasyon tarafından başlatıldı." },
  incelemeye_al: { to: "incelemede", note: "Gönderi incelemeye alındı." },
};

export async function POST(req: Request) {
  const user = await requirePermission("shipment:resolve");
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    shipmentId?: number;
    action?: string;
    grantCredit?: boolean;
  };
  const shipmentId = Number(body.shipmentId);
  const action = ACTIONS[String(body.action ?? "")];

  if (!Number.isFinite(shipmentId) || !action) {
    return Response.json({ error: "Geçersiz çözüm işlemi" }, { status: 400 });
  }

  const result = await transitionShipment({
    shipmentId,
    to: action.to,
    actorRole: user.role,
    actorId: user.id,
    note: action.note,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: 409 });

  let credited = 0;
  if (body.grantCredit) {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
    const existing = await db.select().from(slaCredits).where(eq(slaCredits.shipmentId, shipmentId));
    if (shipment && !existing.some((row) => row.reason === "manuel")) {
      const [tariff] = await db.select().from(tariffs).where(eq(tariffs.code, shipment.tariffCode)).limit(1);
      credited = Math.round(((tariff?.baseKurus ?? shipment.priceKurus) * 50) / 100);
      await db.insert(slaCredits).values({
        shipmentId,
        reason: "manuel",
        amountKurus: credited,
        ratePercent: 50,
        status: "otomatik_onaylandi",
        note: "Operasyon kararıyla jest kredisi işlendi.",
      });
    }
  }

  // Jest kredisi dahil onaylı kredileri hemen cüzdana işle.
  await evaluateGuarantee(shipmentId);

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "istisna_cozuldu",
    entity: "shipment",
    entityId: String(shipmentId),
    meta: { action: body.action, credited },
  });

  return Response.json({ ok: true, credited });
}

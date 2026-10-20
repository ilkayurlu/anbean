import { headers } from "next/headers";
import { getShipmentByToken } from "@/lib/shipments";
import { rateLimit, writeAudit } from "@/lib/auth";
import { maskName, statusDef } from "@/lib/status";

export const dynamic = "force-dynamic";

/**
 * Public takip uç noktası.
 * - Adres ve telefon ASLA dönmez (Faz 3 kabul kriteri)
 * - Ardışık token denemeleri hız sınırına takılır
 */
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (!rateLimit(`track:${ip}`, 30, 60_000)) {
    return Response.json({ error: "Çok fazla deneme. Lütfen bekleyin." }, { status: 429 });
  }

  const clean = token.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length < 6 || clean.length > 32) {
    return Response.json({ error: "Geçersiz takip kodu" }, { status: 400 });
  }

  const result = await getShipmentByToken(clean);
  if (!result) {
    await writeAudit({ action: "takip_bulunamadi", entity: "tracking_token", entityId: clean.slice(0, 4) });
    return Response.json({ error: "Gönderi bulunamadı" }, { status: 404 });
  }

  const { shipment, events } = result;
  return Response.json({
    code: shipment.code,
    status: shipment.status,
    statusLabel: statusDef(shipment.status).label,
    tariffCode: shipment.tariffCode,
    recipient: maskName(shipment.recipientName),
    route: {
      fromDistrict: shipment.pickupDistrict,
      fromCity: shipment.pickupCity,
      toDistrict: shipment.dropDistrict,
      toCity: shipment.dropCity,
    },
    etaAt: shipment.etaAt,
    deliveredAt: shipment.deliveredAt,
    events: events.map((e) => ({
      status: e.status,
      label: statusDef(e.status).label,
      note: e.note,
      district: e.district,
      createdAt: e.createdAt,
    })),
  });
}

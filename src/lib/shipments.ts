import crypto from "node:crypto";
import { db } from "@/db";
import { shipments, shipmentEvents, trackingTokens, notifications, couriers } from "@/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { canTransition, statusDef, type StatusKey } from "./status";
import { writeAudit } from "./auth";
import { evaluateGuarantee } from "./guarantee";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newTrackingToken(): string {
  const bytes = crypto.randomBytes(16);
  let out = "";
  for (let i = 0; i < 14; i += 1) out += ALPHABET[bytes[i % bytes.length] % ALPHABET.length];
  return out;
}

export async function nextShipmentCode(): Promise<string> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(shipments);
  const n = Number(row?.n ?? 0) + 1001;
  return `AB-${new Date().getFullYear()}-${String(n).padStart(6, "0")}`;
}

export type CreateShipmentInput = {
  orgId: number | null;
  createdByUserId: number | null;
  tariffCode: string;
  senderName: string;
  senderPhone: string;
  pickupCity: string;
  pickupDistrict: string;
  pickupAddress: string;
  recipientName: string;
  recipientPhone: string;
  dropCity: string;
  dropDistrict: string;
  dropAddress: string;
  weightGrams: number;
  distanceKm: number;
  priceKurus: number;
  notes?: string;
  status?: StatusKey;
  etaMinutes?: number;
};

export async function createShipment(input: CreateShipmentInput) {
  const code = await nextShipmentCode();
  const status = input.status ?? "alim_planlandi";
  const eta = new Date(Date.now() + (input.etaMinutes ?? 180) * 60_000);

  const [row] = await db
    .insert(shipments)
    .values({
      code,
      orgId: input.orgId,
      createdByUserId: input.createdByUserId,
      tariffCode: input.tariffCode,
      status,
      senderName: input.senderName,
      senderPhone: input.senderPhone,
      pickupCity: input.pickupCity,
      pickupDistrict: input.pickupDistrict,
      pickupAddress: input.pickupAddress,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      dropCity: input.dropCity,
      dropDistrict: input.dropDistrict,
      dropAddress: input.dropAddress,
      weightGrams: input.weightGrams,
      distanceKm: input.distanceKm,
      priceKurus: input.priceKurus,
      notes: input.notes ?? "",
      etaAt: eta,
    })
    .returning();

  const token = newTrackingToken();
  await db.insert(trackingTokens).values({ token, shipmentId: row.id });
  await db.insert(shipmentEvents).values({
    shipmentId: row.id,
    status,
    note: statusDef(status).publicNote,
    district: input.pickupDistrict,
    actorRole: "sistem",
  });

  return { shipment: row, token };
}

export async function transitionShipment(args: {
  shipmentId: number;
  to: string;
  actorRole: string;
  actorId?: number | null;
  note?: string;
  district?: string;
  force?: boolean;
}) {
  const [current] = await db.select().from(shipments).where(eq(shipments.id, args.shipmentId)).limit(1);
  if (!current) return { ok: false as const, error: "Gönderi bulunamadı" };

  if (!args.force && !canTransition(current.status, args.to)) {
    return {
      ok: false as const,
      error: `Geçersiz durum geçişi: ${statusDef(current.status).label} → ${statusDef(args.to).label}`,
    };
  }

  const def = statusDef(args.to);
  const now = new Date();
  const becameException = def.kind === "risk" || def.kind === "return";
  const leftException =
    !becameException && current.exceptionAt !== null && current.resolvedAt === null;

  const [updated] = await db
    .update(shipments)
    .set({
      status: args.to,
      updatedAt: now,
      deliveredAt: args.to === "teslim_edildi" ? now : current.deliveredAt,
      // Cüzdanla ödenmiş gönderi teslimde "ödendi" kalır; yalnızca fatura bekleyen faturalanır.
      financialStatus:
        args.to === "teslim_edildi" && current.financialStatus === "fatura_bekliyor"
          ? "faturalandi"
          : current.financialStatus,
      // İstisna çözüm saati: açılış ve kapanış damgaları
      exceptionAt: becameException ? (current.exceptionAt ?? now) : current.exceptionAt,
      resolvedAt: leftException ? now : current.resolvedAt,
    })
    .where(eq(shipments.id, args.shipmentId))
    .returning();

  await db.insert(shipmentEvents).values({
    shipmentId: args.shipmentId,
    status: args.to,
    note: args.note?.slice(0, 200) || def.publicNote,
    district: args.district ?? current.dropDistrict,
    actorRole: args.actorRole,
  });

  // Bildirim: PII loglanmaz, hedef maskelenir.
  await db.insert(notifications).values({
    shipmentId: args.shipmentId,
    channel: "sms",
    template: `durum_${args.to}`,
    maskedTarget: maskPhone(current.recipientPhone),
  });

  await writeAudit({
    actorId: args.actorId ?? null,
    actorRole: args.actorRole,
    action: "durum_degisikligi",
    entity: "shipment",
    entityId: String(args.shipmentId),
    meta: { from: current.status, to: args.to },
  });

  if (args.to === "teslim_edildi" && current.assignedCourierId) {
    await db
      .update(couriers)
      .set({ activeLoad: sql`greatest(${couriers.activeLoad} - 1, 0)` })
      .where(eq(couriers.id, current.assignedCourierId));
  }

  // Teslimat Güvencesi: müşteri talep etmeden değerlendir.
  if (args.to === "teslim_edildi" || becameException) {
    await evaluateGuarantee(args.shipmentId);
  }

  return { ok: true as const, shipment: updated };
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  return `${digits.slice(0, 3)}*****${digits.slice(-2)}`;
}

export async function getShipmentByToken(token: string) {
  const [link] = await db.select().from(trackingTokens).where(eq(trackingTokens.token, token)).limit(1);
  if (!link) return null;
  const [shipment] = await db.select().from(shipments).where(eq(shipments.id, link.shipmentId)).limit(1);
  if (!shipment) return null;
  const events = await db
    .select()
    .from(shipmentEvents)
    .where(and(eq(shipmentEvents.shipmentId, shipment.id), eq(shipmentEvents.isPublic, true)))
    .orderBy(desc(shipmentEvents.createdAt));

  await db
    .update(trackingTokens)
    .set({ hitCount: sql`${trackingTokens.hitCount} + 1` })
    .where(eq(trackingTokens.id, link.id));

  return { shipment, events, token };
}

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { shipments, supportTickets, ticketMessages, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { rateLimit, requirePermission, requireAuth, writeAudit } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["teslimat_sorunu", "odeme", "arac_sorunu", "sikayet", "diger"] as const;

const createSchema = z.object({
  category: z.enum(CATEGORIES),
  subject: z.string().trim().min(5, "Konu en az 5 karakter").max(140),
  description: z.string().trim().min(10, "Açıklama en az 10 karakter").max(2000),
  shipmentId: z.number().int().positive().optional(),
  rideId: z.number().int().positive().optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  // Destek ekibi tüm talepleri görür; diğerleri yalnızca kendininkini (tenant izolasyonu).
  const canSeeAll = hasPermission(user.role, "support:manage");
  const rows = canSeeAll
    ? await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt)).limit(100)
    : await db
        .select()
        .from(supportTickets)
        .where(eq(supportTickets.userId, user.id))
        .orderBy(desc(supportTickets.createdAt));

  const authors = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const nameById = new Map(authors.map((a) => [a.id, a.fullName]));

  return Response.json({
    canManage: canSeeAll,
    tickets: rows.map((t) => ({
      ...t,
      ownerName: nameById.get(t.userId) ?? "—",
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`ticket:${user.id}:${ip}`, 10, 10 * 60_000)) {
    return Response.json({ error: "Çok fazla talep açtınız. Lütfen bekleyin." }, { status: 429 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Form eksik" }, { status: 400 });
  }
  const input = parsed.data;

  // İlişkilendirilen gönderi gerçekten bu kullanıcıya ait olmalı (IDOR engeli).
  let shipmentId: number | null = null;
  if (input.shipmentId) {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, input.shipmentId)).limit(1);
    const owns =
      shipment &&
      (user.role === "admin" ||
        shipment.createdByUserId === user.id ||
        (user.orgId !== null && shipment.orgId === user.orgId));
    if (!owns) return Response.json({ error: "Bu gönderi için talep açamazsınız." }, { status: 403 });
    shipmentId = shipment.id;
  }

  const seq = Date.now().toString().slice(-6);
  const code = `TAL-${new Date().getFullYear()}-${seq}`;

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      code,
      userId: user.id,
      orgId: user.orgId,
      shipmentId,
      rideId: input.rideId ?? null,
      category: input.category,
      subject: input.subject,
      priority: input.category === "sikayet" ? "high" : "normal",
    })
    .returning();

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    authorId: user.id,
    authorRole: user.role,
    body: input.description,
  });

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "destek_talebi_acildi",
    entity: "support_ticket",
    entityId: String(ticket.id),
    meta: { category: input.category, shipmentId },
  });

  return Response.json({ ok: true, code: ticket.code, id: ticket.id });
}

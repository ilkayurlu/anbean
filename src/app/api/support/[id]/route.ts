import { z } from "zod";
import { db } from "@/db";
import { supportTickets, ticketMessages, users } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { requireAuth, writeAudit } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const messageSchema = z.object({ body: z.string().trim().min(2, "Mesaj en az 2 karakter").max(2000) });
const statusSchema = z.object({
  status: z.enum(["acik", "isleniyor", "cozuldu", "kapatildi"]),
});

async function loadTicket(id: number) {
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  if (!ticket) return null;
  const messages = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(asc(ticketMessages.createdAt));
  const authors = await db.select({ id: users.id, fullName: users.fullName }).from(users);
  const nameById = new Map(authors.map((a) => [a.id, a.fullName]));
  return { ticket, messages, nameById };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id)) return Response.json({ error: "Geçersiz talep" }, { status: 400 });

  const loaded = await loadTicket(id);
  if (!loaded) return Response.json({ error: "Talep bulunamadı" }, { status: 404 });

  const canManage = hasPermission(user.role, "support:manage");
  if (!canManage && loaded.ticket.userId !== user.id) {
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "yetkisiz_erisim_denemesi",
      entity: "support_ticket",
      entityId: String(id),
    });
    return Response.json({ error: "Yetkisiz" }, { status: 403 });
  }

  return Response.json({
    canManage,
    ticket: loaded.ticket,
    messages: loaded.messages.map((m) => ({
      ...m,
      authorName: m.authorId ? (loaded.nameById.get(m.authorId) ?? "—") : "Sistem",
    })),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const id = Number((await ctx.params).id);
  const loaded = await loadTicket(id);
  if (!loaded) return Response.json({ error: "Talep bulunamadı" }, { status: 404 });

  const canManage = hasPermission(user.role, "support:manage");
  if (!canManage && loaded.ticket.userId !== user.id) {
    return Response.json({ error: "Yetkisiz" }, { status: 403 });
  }
  if (loaded.ticket.status === "kapatildi" && !canManage) {
    return Response.json({ error: "Kapatılmış talebe yazılamaz." }, { status: 409 });
  }

  const parsed = messageSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Mesaj geçersiz" }, { status: 400 });
  }

  await db.insert(ticketMessages).values({
    ticketId: id,
    authorId: user.id,
    authorRole: user.role,
    body: parsed.data.body,
  });

  // Talep sahibinin yanıtı talebi yeniden açar; destek yanıtı "işleniyor"a alır.
  const nextStatus =
    loaded.ticket.status === "cozuldu" && loaded.ticket.userId === user.id
      ? "acik"
      : canManage && loaded.ticket.status === "acik"
        ? "isleniyor"
        : loaded.ticket.status;

  await db
    .update(supportTickets)
    .set({ status: nextStatus, resolvedAt: nextStatus === "cozuldu" ? new Date() : loaded.ticket.resolvedAt })
    .where(eq(supportTickets.id, id));

  return Response.json({ ok: true, status: nextStatus });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const id = Number((await ctx.params).id);
  const loaded = await loadTicket(id);
  if (!loaded) return Response.json({ error: "Talep bulunamadı" }, { status: 404 });

  const parsed = statusSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Geçersiz durum" }, { status: 400 });

  const canManage = hasPermission(user.role, "support:manage");
  const isOwner = loaded.ticket.userId === user.id;
  // Sahibi yalnızca kapatabilir; durum akışını destek ekibi yönetir.
  if (!canManage && !(isOwner && parsed.data.status === "kapatildi")) {
    return Response.json({ error: "Bu durumu değiştirmeye yetkiniz yok." }, { status: 403 });
  }

  await db
    .update(supportTickets)
    .set({
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "cozuldu" ? new Date() : null,
      assignedToUserId: canManage ? user.id : loaded.ticket.assignedToUserId,
    })
    .where(eq(supportTickets.id, id));

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "destek_talebi_guncellendi",
    entity: "support_ticket",
    entityId: String(id),
    meta: { status: parsed.data.status },
  });

  return Response.json({ ok: true, status: parsed.data.status });
}

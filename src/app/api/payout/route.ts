import { z } from "zod";
import { db } from "@/db";
import { couriers, payoutRequests, wallets } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, requirePermission, writeAudit } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const MIN_PAYOUT_KURUS = 10_000; // 100 TL altı çıkış yok: bankacılık maliyeti

const requestSchema = z.object({
  amountKurus: z.number().int().min(MIN_PAYOUT_KURUS, "En az 100 TL talep edilebilir"),
  iban: z
    .string()
    .trim()
    .regex(/^TR\d{2}[\s\d]{16,22}$/, "Geçerli bir TR IBAN girin"),
});

/** IBAN'ın yalnızca maskesi saklanır; tam numara loglanmaz ve arayüze dönmez. */
function maskIban(iban: string): string {
  const digits = iban.replace(/\s/g, "");
  return `${digits.slice(0, 6)}****${digits.slice(-4)}`;
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const canManage = hasPermission(user.role, "finance:read");
  const rows = canManage
    ? await db.select().from(payoutRequests).orderBy(desc(payoutRequests.createdAt)).limit(100)
    : await ownRequests(user.id);

  return Response.json({ canManage, requests: rows });
}

async function ownRequests(userId: number) {
  const [courier] = await db.select().from(couriers).where(eq(couriers.userId, userId)).limit(1);
  if (!courier) return [];
  return db
    .select()
    .from(payoutRequests)
    .where(eq(payoutRequests.courierId, courier.id))
    .orderBy(desc(payoutRequests.createdAt));
}

/** Hakediş çıkış talebi — bakiye kontrolü sunucuda, tutar istemciden doğrulanır. */
export async function POST(req: Request) {
  const user = await requirePermission("courier:payout:request");
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const [courier] = await db.select().from(couriers).where(eq(couriers.userId, user.id)).limit(1);
  if (!courier) return Response.json({ error: "Kurye profili bulunamadı" }, { status: 403 });

  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz talep" }, { status: 400 });
  }

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.ownerKind, "courier"), eq(wallets.ownerId, courier.id)))
    .limit(1);
  const balance = wallet?.balanceKurus ?? 0;
  if (balance < parsed.data.amountKurus) {
    return Response.json({ error: "Talep tutarı hakediş bakiyesinden yüksek." }, { status: 409 });
  }

  const pending = await db
    .select()
    .from(payoutRequests)
    .where(and(eq(payoutRequests.courierId, courier.id), eq(payoutRequests.status, "beklemede")));
  if (pending.length > 0) {
    return Response.json({ error: "Bekleyen bir talebiniz zaten var." }, { status: 409 });
  }

  const code = `PAY-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  const [row] = await db
    .insert(payoutRequests)
    .values({
      code,
      courierId: courier.id,
      amountKurus: parsed.data.amountKurus,
      ibanMasked: maskIban(parsed.data.iban),
      requestedByUserId: user.id,
    })
    .returning();

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "hakedis_talebi",
    entity: "payout_request",
    entityId: String(row.id),
    meta: { amountKurus: row.amountKurus },
  });

  return Response.json({ ok: true, code: row.code, id: row.id });
}

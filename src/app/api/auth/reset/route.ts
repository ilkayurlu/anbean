import { z } from "zod";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { rateLimit, writeAudit } from "@/lib/auth";
import { hashPassword, hashToken } from "@/lib/password";

export const dynamic = "force-dynamic";

const schema = z.object({
  token: z.string().min(20).max(200),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter")
    .max(128)
    .regex(/[A-Za-zçğıöşüÇĞİÖŞÜ]/, "Şifre en az bir harf içermeli")
    .regex(/\d/, "Şifre en az bir rakam içermeli"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz istek" }, { status: 400 });
  }
  if (!rateLimit(`reset:${parsed.data.token.slice(0, 12)}`, 10, 10 * 60_000)) {
    return Response.json({ error: "Çok fazla deneme." }, { status: 429 });
  }

  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, hashToken(parsed.data.token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!reset) return Response.json({ error: "Bağlantı geçersiz veya süresi dolmuş." }, { status: 400 });

  await db
    .update(users)
    .set({ passwordHash: hashPassword(parsed.data.password) })
    .where(eq(users.id, reset.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));

  await writeAudit({
    actorId: reset.userId,
    actorRole: "musteri",
    action: "sifre_sifirlandi",
    entity: "user",
    entityId: String(reset.userId),
  });

  return Response.json({ ok: true });
}

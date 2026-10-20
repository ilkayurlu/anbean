import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { passwordResets, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { rateLimit } from "@/lib/auth";
import { hashToken, newResetToken } from "@/lib/password";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(160),
});

/**
 * Şifre sıfırlama isteği.
 * - E-posta sağlayıcısı bağlı değil: token yalnızca sunucu günlüğüne yazılır
 *   ve arayüz bunu dürüstçe söyler. Sıfırlama bağlantısı üretilmez gibi davranmıyoruz.
 * - Hesap olsun olmasın aynı yanıt döner (enumeration engeli).
 * - Ham token saklanmaz, yalnızca sha256 özeti.
 */
export async function POST(req: Request) {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`forgot:${ip}`, 5, 10 * 60_000)) {
    return Response.json({ error: "Çok fazla istek. Lütfen bekleyin." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Geçerli bir e-posta girin." }, { status: 400 });

  const generic = { ok: true, message: "E-posta kayıtlıysa sıfırlama bağlantısı gönderildi." };
  const [user] = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (!user || !user.isActive || user.isBanned) return Response.json(generic);

  const token = newResetToken();
  await db.insert(passwordResets).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 30 * 60_000),
  });

  // Gerçek dağıtımda bu satır yerine e-posta kuyruğuna iş yazılır.
  console.info(`[sifre-sifirlama] kullanici=${user.id} baglanti=/sifremi-unuttum?token=${token}`);

  return Response.json(generic);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (token.length < 20) return Response.json({ valid: false });

  const rows = await db
    .select({ userId: passwordResets.userId })
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, hashToken(token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return Response.json({ valid: rows.length > 0 });
}

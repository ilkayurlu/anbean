import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionValue, SESSION_COOKIE, writeAudit, rateLimit, type Role } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { HOME_BY_ROLE, ROLE_PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/**
 * Giriş.
 * - Şifreler yalnızca scrypt hash'iyle doğrulanır.
 * - Hata mesajı hangi bilginin yanlış olduğunu söylemez (enumeration engeli).
 * - Başarısız denemeler denetime yazılır, hız sınırına tabidir.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!rateLimit(`login:${email}`, 10, 60_000)) {
    return Response.json({ error: "Çok fazla giriş denemesi. Bir dakika bekleyin." }, { status: 429 });
  }
  if (!email || !password) {
    return Response.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.isActive || user.isBanned) {
    await writeAudit({ action: "giris_basarisiz", entity: "user", entityId: email });
    return Response.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
  }

  const passwordOk = verifyPassword(password, user.passwordHash);
  if (!passwordOk) {
    await writeAudit({ action: "giris_basarisiz", entity: "user", entityId: email });
    return Response.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionValue(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "giris",
    entity: "user",
    entityId: String(user.id),
  });

  const role = user.role as Role;
  return Response.json({
    ok: true,
    role,
    redirect: HOME_BY_ROLE[role] ?? "/app",
    permissionCount: ROLE_PERMISSIONS[role]?.length ?? 0,
  });
}

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { organizations, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionValue, rateLimit, SESSION_COOKIE, writeAudit, type Role } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { ensureWallet } from "@/lib/ledger";
import { HOME_BY_ROLE } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const schema = z.object({
  fullName: z.string().trim().min(3, "Ad soyad en az 3 karakter").max(120),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(160)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Geçerli bir e-posta girin"),
  // Telefon opsiyonel: alan hiç gönderilmese de kayıt geçerli olmalı.
  // (Zorunlu tutulduğunda KVKK reddi gibi gerçek hatalar bu mesajın arkasına saklanıyordu.)
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .refine((v) => !v || v.replace(/\D/g, "").length >= 10, "Telefon en az 10 haneli olmalı"),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter")
    .max(128)
    .regex(/[A-Za-zçğıöşüÇĞİÖŞÜ]/, "Şifre en az bir harf içermeli")
    .regex(/\d/, "Şifre en az bir rakam içermeli"),
  kvkkConsent: z.literal(true, { message: "KVKK aydınlatma onayı zorunlu" }),
  marketingConsent: z.boolean().optional(),
});

export async function POST(req: Request) {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`register:${ip}`, 5, 10 * 60_000)) {
    return Response.json({ error: "Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json({ error: first?.message ?? "Form eksik" }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existing.length > 0) {
    // Hangi alanın dolu olduğunu söylemiyoruz: hesap enumeration'ı engellenir.
    return Response.json({ error: "Bu bilgilerle kayıt tamamlanamadı." }, { status: 409 });
  }

  // Rol istemciden alınmaz: her kayıt müşteri olarak açılır.
  // Bireysel kullanıcıya kendi tenant'ı verilir; başka müşterinin gönderisini göremez.
  const [org] = await db
    .insert(organizations)
    .values({ name: `${input.fullName} (bireysel)`, slug: `b-${Date.now().toString(36)}`, type: "bireysel" })
    .returning();

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      fullName: input.fullName,
      phone: input.phone || null,
      role: "musteri",
      orgId: org.id,
      passwordHash: hashPassword(input.password),
      marketingConsent: Boolean(input.marketingConsent),
      kvkkConsentAt: new Date(),
      lastLoginAt: new Date(),
    })
    .returning();

  await ensureWallet("user", user.id);

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionValue(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  const role = user.role as Role;
  await writeAudit({
    actorId: user.id,
    actorRole: role,
    action: "kayit",
    entity: "user",
    entityId: String(user.id),
    // Şifre ve PII loglanmaz.
    meta: { orgId: org.id, marketingConsent: Boolean(input.marketingConsent) },
  });

  return Response.json({ ok: true, role, redirect: HOME_BY_ROLE[role] });
}

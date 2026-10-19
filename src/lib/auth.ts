import { cookies } from "next/headers";
import crypto from "node:crypto";
import { db } from "@/db";
import { users, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasPermission, type Permission } from "./permissions";

export type Role = "musteri" | "kurye" | "ops" | "finance" | "support" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  musteri: "Müşteri",
  kurye: "Kurye",
  ops: "Operasyon",
  finance: "Finans",
  support: "Destek",
  admin: "Yönetici",
};

export type SessionUser = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  orgId: number | null;
};

const COOKIE = "anbean_session";
function sessionSecret(): string {
  const configuredSecret = process.env.SESSION_SECRET;
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return "anbean-dev-secret-change-me";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", sessionSecret()).update(payload).digest("hex").slice(0, 32);
}

export function createSessionValue(userId: number): string {
  const payload = `${userId}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

function parseSessionValue(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const payload = `${parts[0]}.${parts[1]}`;
  if (sign(payload) !== parts[2]) return null;
  const id = Number(parts[0]);
  return Number.isFinite(id) ? id : null;
}

export const SESSION_COOKIE = COOKIE;

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const userId = parseSessionValue(raw);
  if (!userId) return null;

  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = rows[0];
  if (!user || !user.isActive || user.isBanned) return null;
  const role = user.role as Role;
  if (!(role in ROLE_LABEL)) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role,
    orgId: user.orgId,
  };
}

/** Rol yükseltme girişimleri burada reddedilir ve denetime yazılır. */
export async function requireRole(allowed: Role[]): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (!allowed.includes(user.role)) {
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "yetkisiz_erisim_denemesi",
      entity: "route",
      entityId: allowed.join(","),
    });
    return null;
  }
  return user;
}

/**
 * İzin tabanlı kontrol. Rol adı değil izin adı sorulur; rol yükseltme ve
 * yetkisiz erişim denemeleri denetim kaydına yazılır.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (!hasPermission(user.role, permission)) {
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "yetkisiz_erisim_denemesi",
      entity: "permission",
      entityId: permission,
    });
    return null;
  }
  return user;
}

/** Yalnızca oturum açmış olmayı gerektiren rotalar için. */
export async function requireAuth(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function writeAudit(entry: {
  actorId?: number | null;
  actorRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLog).values({
    actorId: entry.actorId ?? null,
    actorRole: entry.actorRole ?? "anonim",
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? "",
    meta: entry.meta ?? {},
  });
}

/* Basit bellek içi oran sınırı — token tahmin saldırılarına karşı. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

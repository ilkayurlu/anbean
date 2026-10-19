import crypto from "node:crypto";

/**
 * Şifre saklama: node:crypto scrypt.
 * bcryptjs yerine yerleşik modül — ek bağımlılık ve native derleme yok,
 * ayrıca scrypt bellek-zorlu olduğundan GPU saldırısına daha dayanıklı.
 * Biçim: scrypt:<salt-hex>:<hash-hex>
 */
const KEYLEN = 32;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEYLEN) return false;
  const candidate = crypto.scryptSync(password, salt, KEYLEN);
  return crypto.timingSafeEqual(candidate, expected);
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newResetToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** OTP: kısa ömürlü, yalnızca özeti saklanır. */
export function newOtp(): { code: string; hash: string } {
  const code = String(crypto.randomInt(100000, 999999));
  return { code, hash: hashToken(code) };
}

export function verifyOtp(code: string, hash: string): boolean {
  const a = Buffer.from(hashToken(code));
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

import type { Role } from "./auth";

/**
 * Rol → izin matrisi.
 * Kural: hiçbir rotada "rol adı" ile yetki verilmez, izin adı verilir.
 * Böylece yeni rol eklemek mevcut kontrolleri gevşetmez.
 */
export type Permission =
  | "shipment:create"
  | "shipment:read"
  | "shipment:update"
  | "shipment:cancel"
  | "shipment:assign"
  | "shipment:track"
  | "shipment:resolve"
  | "ride:create"
  | "ride:read"
  | "ride:end"
  | "vehicle:read"
  | "vehicle:unlock"
  | "vehicle:manage"
  | "courier:read"
  | "courier:manage"
  | "courier:verify"
  | "courier:payout:request"
  | "finance:read"
  | "finance:payout"
  | "finance:refund"
  | "support:read"
  | "support:manage"
  | "zone:read"
  | "zone:manage"
  | "tariff:read"
  | "tariff:manage"
  | "user:read"
  | "user:manage"
  | "audit:read"
  | "report:read"
  | "notification:send"
  | "cms:manage";

export const ALL_PERMISSIONS: Permission[] = [
  "shipment:create", "shipment:read", "shipment:update", "shipment:cancel", "shipment:assign",
  "shipment:track", "shipment:resolve", "ride:create", "ride:read", "ride:end", "vehicle:read",
  "vehicle:unlock", "vehicle:manage", "courier:read", "courier:manage", "courier:verify",
  "courier:payout:request", "finance:read", "finance:payout", "finance:refund", "support:read",
  "support:manage", "zone:read", "zone:manage", "tariff:read", "tariff:manage", "user:read",
  "user:manage", "audit:read", "report:read", "notification:send", "cms:manage",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  musteri: [
    "shipment:create", "shipment:read", "shipment:track", "shipment:cancel",
    "ride:create", "ride:read", "ride:end",
    "vehicle:read", "vehicle:unlock",
    "support:read",
  ],
  kurye: [
    "shipment:read", "shipment:update", "shipment:track",
    "vehicle:read", "courier:payout:request", "support:read", "report:read",
  ],
  // ops = sevkiyat sorumlusu + operasyon yöneticisi
  ops: [
    "shipment:read", "shipment:update", "shipment:assign", "shipment:track", "shipment:resolve",
    "shipment:cancel", "courier:read", "courier:manage",
    "vehicle:read", "vehicle:manage", "zone:read", "zone:manage",
    "support:read", "support:manage", "report:read", "notification:send", "ride:read",
  ],
  finance: [
    "finance:read", "finance:payout", "finance:refund",
    "shipment:read", "ride:read", "report:read", "audit:read",
  ],
  support: [
    "shipment:read", "shipment:track", "ride:read",
    "user:read", "courier:read", "support:read", "support:manage",
  ],
  admin: ALL_PERMISSIONS,
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Rol bazlı ana sayfa — giriş sonrası yönlendirme. */
export const HOME_BY_ROLE: Record<Role, string> = {
  musteri: "/app",
  kurye: "/courier",
  ops: "/ops",
  finance: "/admin/finans",
  support: "/admin/destek",
  admin: "/admin",
};

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { and, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  cmsPages,
  couriers,
  orders,
  organizations,
  restaurants,
  shipments,
  supportTickets,
  users,
} from "@/db/schema";
import { rateLimit, requireAuth, writeAudit } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const querySchema = z.string().trim().min(2).max(80);
const resultLimit = 8;

type SearchItem = {
  id: number;
  title: string;
  detail: string;
};

function addGroup(groups: Record<string, SearchItem[]>, key: string, items: SearchItem[]) {
  if (items.length > 0) groups[key] = items;
}

export async function GET(request: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const parsed = querySchema.safeParse(new URL(request.url).searchParams.get("q"));
  if (!parsed.success) {
    return Response.json({ error: "Arama en az 2, en fazla 80 karakter olmalı." }, { status: 400 });
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`search:${user.id}:${ip}`, 30, 60_000)) {
    return Response.json({ error: "Çok fazla arama yaptınız. Lütfen bekleyin." }, { status: 429 });
  }

  const term = parsed.data.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${term}%`;
  const groups: Record<string, SearchItem[]> = {};

  if (user.role === "musteri") {
    const rows = await db
      .select({
        id: orders.id,
        code: orders.code,
        status: orders.status,
        district: orders.district,
        restaurantName: restaurants.name,
        courierId: couriers.id,
        courierName: couriers.fullName,
        courierCity: couriers.city,
        courierVehicle: couriers.vehicle,
      })
      .from(orders)
      .leftJoin(restaurants, eq(orders.restaurantId, restaurants.id))
      .leftJoin(shipments, eq(orders.shipmentId, shipments.id))
      .leftJoin(couriers, eq(shipments.assignedCourierId, couriers.id))
      .where(
        and(
          eq(orders.userId, user.id),
          or(
            ilike(orders.code, pattern),
            ilike(orders.status, pattern),
            ilike(orders.district, pattern),
            ilike(restaurants.name, pattern),
            ilike(couriers.fullName, pattern),
          ),
        ),
      )
      .limit(resultLimit);

    addGroup(
      groups,
      "orders",
      rows.map((row) => ({
        id: row.id,
        title: row.code,
        detail: `${row.restaurantName ?? "Sipariş"} · ${row.status} · ${row.district}`,
      })),
    );
    addGroup(
      groups,
      "couriers",
      rows
        .filter((row) => row.courierId !== null && row.courierName !== null && row.courierCity !== null)
        .map((row) => ({
          id: row.courierId!,
          title: row.courierName!,
          detail: `${row.courierCity} · ${row.courierVehicle ?? "Kurye"}`,
        }))
        .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index),
    );
  } else if (user.role === "kurye") {
    const [courier] = await db.select({ id: couriers.id }).from(couriers).where(eq(couriers.userId, user.id)).limit(1);
    if (courier) {
      const rows = await db
        .select({ id: shipments.id, code: shipments.code, status: shipments.status, district: shipments.dropDistrict })
        .from(shipments)
        .where(
          and(
            eq(shipments.assignedCourierId, courier.id),
            or(ilike(shipments.code, pattern), ilike(shipments.status, pattern), ilike(shipments.dropDistrict, pattern)),
          ),
        )
        .limit(resultLimit);
      addGroup(
        groups,
        "shipments",
        rows.map((row) => ({ id: row.id, title: row.code, detail: `${row.status} · ${row.district}` })),
      );
    }
  } else {
    if (hasPermission(user.role, "shipment:read")) {
      const rows = await db
        .select({ id: shipments.id, code: shipments.code, status: shipments.status, district: shipments.dropDistrict })
        .from(shipments)
        .where(
          or(
            ilike(shipments.code, pattern),
            ilike(shipments.status, pattern),
            ilike(shipments.pickupDistrict, pattern),
            ilike(shipments.dropDistrict, pattern),
          ),
        )
        .limit(resultLimit);
      addGroup(
        groups,
        "shipments",
        rows.map((row) => ({ id: row.id, title: row.code, detail: `${row.status} · ${row.district}` })),
      );

      const orderRows = await db
        .select({ id: orders.id, code: orders.code, status: orders.status, restaurantName: restaurants.name })
        .from(orders)
        .innerJoin(restaurants, eq(orders.restaurantId, restaurants.id))
        .where(or(ilike(orders.code, pattern), ilike(orders.status, pattern), ilike(restaurants.name, pattern)))
        .limit(resultLimit);
      addGroup(
        groups,
        "orders",
        orderRows.map((row) => ({ id: row.id, title: row.code, detail: `${row.restaurantName} · ${row.status}` })),
      );
    }

    if (hasPermission(user.role, "courier:read")) {
      const rows = await db
        .select({ id: couriers.id, fullName: couriers.fullName, city: couriers.city, vehicle: couriers.vehicle, status: couriers.status })
        .from(couriers)
        .where(or(ilike(couriers.fullName, pattern), ilike(couriers.city, pattern), ilike(couriers.vehicle, pattern)))
        .limit(resultLimit);
      addGroup(
        groups,
        "couriers",
        rows.map((row) => ({ id: row.id, title: row.fullName, detail: `${row.city} · ${row.vehicle} · ${row.status}` })),
      );
    }

    if (hasPermission(user.role, "user:read")) {
      const rows = await db
        .select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role })
        .from(users)
        .where(or(ilike(users.fullName, pattern), ilike(users.email, pattern)))
        .limit(resultLimit);
      addGroup(
        groups,
        "users",
        rows.map((row) => ({ id: row.id, title: row.fullName, detail: row.role })),
      );

      const orgRows = await db
        .select({ id: organizations.id, name: organizations.name, type: organizations.type })
        .from(organizations)
        .where(ilike(organizations.name, pattern))
        .limit(resultLimit);
      addGroup(groups, "organizations", orgRows.map((row) => ({ id: row.id, title: row.name, detail: row.type })));
    }

    if (hasPermission(user.role, "support:read")) {
      const canSeeAll = hasPermission(user.role, "support:manage");
      const rows = await db
        .select({ id: supportTickets.id, code: supportTickets.code, subject: supportTickets.subject, status: supportTickets.status })
        .from(supportTickets)
        .where(
          and(
            ...(canSeeAll ? [] : [eq(supportTickets.userId, user.id)]),
            or(ilike(supportTickets.code, pattern), ilike(supportTickets.subject, pattern), ilike(supportTickets.status, pattern)),
          ),
        )
        .limit(resultLimit);
      addGroup(
        groups,
        "support",
        rows.map((row) => ({ id: row.id, title: `${row.code} · ${row.subject}`, detail: row.status })),
      );
    }

    if (hasPermission(user.role, "cms:manage")) {
      const rows = await db
        .select({ id: cmsPages.id, title: cmsPages.title, slug: cmsPages.slug, status: cmsPages.status })
        .from(cmsPages)
        .where(or(ilike(cmsPages.title, pattern), ilike(cmsPages.slug, pattern)))
        .limit(resultLimit);
      addGroup(groups, "cms", rows.map((row) => ({ id: row.id, title: row.title, detail: `${row.slug} · ${row.status}` })));
    }
  }

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "global_search",
    entity: "search",
    meta: {
      queryHash: createHash("sha256").update(parsed.data.toLocaleLowerCase("tr-TR")).digest("hex"),
      queryLength: parsed.data.length,
      resultGroups: Object.keys(groups),
    },
  });

  return Response.json({ groups });
}
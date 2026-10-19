import { z } from "zod";
import { db } from "@/db";
import {
  auditLog,
  fleetApplications,
  fleets,
  restaurants,
  merchants,
  restaurantApplications,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["in_review", "approved", "rejected"]),
  reason: z.string().trim().max(1000).optional(),
});

function slugBase(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "partner";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const user = await requireRole(["admin"]);
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 403 });

  const { kind, id: idValue } = await params;
  if (kind !== "restaurant" && kind !== "fleet") {
    return Response.json({ error: "Başvuru türü geçersiz." }, { status: 404 });
  }
  const id = Number(idValue);
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: "Başvuru numarası geçersiz." }, { status: 400 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "İşlem bilgileri geçersiz." }, { status: 400 });
  }
  const { status, reason = "" } = parsed.data;
  if (status === "rejected" && reason.length < 5) {
    return Response.json({ error: "Red gerekçesi en az 5 karakter olmalı." }, { status: 400 });
  }

  try {
    await db.transaction(async (tx) => {
      if (kind === "restaurant") {
        const [application] = await tx
          .select()
          .from(restaurantApplications)
          .where(eq(restaurantApplications.id, id))
          .for("update")
          .limit(1);
        if (!application) throw new Error("NOT_FOUND");
        if (status === "in_review" && application.status !== "submitted") throw new Error("INVALID_TRANSITION");
        if (status !== "in_review" && application.status !== "in_review") throw new Error("INVALID_TRANSITION");

        await tx
          .update(restaurantApplications)
          .set({
            status,
            reviewReason: status === "rejected" ? reason : "",
            reviewedByUserId: user.id,
            reviewedAt: status === "in_review" ? null : new Date(),
            updatedAt: new Date(),
          })
          .where(eq(restaurantApplications.id, id));

        if (status === "approved") {
          const slug = `${slugBase(application.businessName)}-${id}`;
          await tx.insert(restaurants).values({
            slug,
            name: application.businessName,
            cuisine: application.cuisine,
            city: application.city,
            district: application.district,
            address: application.address,
            phone: application.phone,
            website: application.website,
            openingHours: application.openingHours,
            isDemo: false,
            note: "",
            isOpen: false,
          });
          await tx.insert(merchants).values({
            applicationId: id,
            slug,
            businessName: application.businessName,
          });
        }
      } else {
        const [application] = await tx
          .select()
          .from(fleetApplications)
          .where(eq(fleetApplications.id, id))
          .for("update")
          .limit(1);
        if (!application) throw new Error("NOT_FOUND");
        if (status === "in_review" && application.status !== "submitted") throw new Error("INVALID_TRANSITION");
        if (status !== "in_review" && application.status !== "in_review") throw new Error("INVALID_TRANSITION");

        await tx
          .update(fleetApplications)
          .set({
            status,
            reviewReason: status === "rejected" ? reason : "",
            reviewedByUserId: user.id,
            reviewedAt: status === "in_review" ? null : new Date(),
            updatedAt: new Date(),
          })
          .where(eq(fleetApplications.id, id));

        if (status === "approved") {
          await tx.insert(fleets).values({
            applicationId: id,
            slug: `${slugBase(application.companyName)}-${id}`,
            companyName: application.companyName,
            phone: application.phone,
            website: application.website,
            serviceTypes: application.serviceTypes,
            regions: application.regions,
          });
        }
      }

      await tx.insert(auditLog).values({
        actorId: user.id,
        actorRole: user.role,
        action: `isletme_basvurusu_${status}`,
        entity: `${kind}_application`,
        entityId: String(id),
        meta: status === "rejected" ? { reason } : {},
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return Response.json({ error: "Başvuru bulunamadı." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "INVALID_TRANSITION") {
      return Response.json({ error: "Bu başvuruda istenen durum geçişi yapılamaz." }, { status: 409 });
    }
    throw error;
  }

  return Response.json({ ok: true, status });
}

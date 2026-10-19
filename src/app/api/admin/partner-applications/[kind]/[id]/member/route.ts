import { z } from "zod";
import { db } from "@/db";
import { auditLog, fleetApplications, fleetMembers, merchantMembers, merchants, restaurantApplications, users, fleets } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(160) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const admin = await requireRole(["admin"]);
  if (!admin) return Response.json({ error: "Yetkisiz" }, { status: 403 });

  const { kind, id: rawId } = await params;
  if (kind !== "restaurant" && kind !== "fleet") {
    return Response.json({ error: "Başvuru türü geçersiz." }, { status: 404 });
  }
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return Response.json({ error: "Başvuru numarası geçersiz." }, { status: 400 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Geçerli hesap e-postası gerekli." }, { status: 400 });

  try {
    const result = await db.transaction(async (tx) => {
      const [account] = await tx
        .select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive, isBanned: users.isBanned })
        .from(users)
        .where(eq(users.email, parsed.data.email))
        .limit(1);
      if (!account || !account.isActive || account.isBanned || account.role !== "musteri") throw new Error("ACCOUNT_INVALID");

      if (kind === "restaurant") {
        const [application] = await tx.select().from(restaurantApplications)
          .where(eq(restaurantApplications.id, id)).for("update").limit(1);
        if (!application || application.status !== "approved") throw new Error("APPLICATION_NOT_APPROVED");
        if (application.email.toLowerCase() !== account.email.toLowerCase()) throw new Error("EMAIL_MISMATCH");
        const [merchant] = await tx.select().from(merchants)
          .where(eq(merchants.applicationId, id)).limit(1);
        if (!merchant) throw new Error("PARTNER_MISSING");
        await tx.insert(merchantMembers).values({ merchantId: merchant.id, userId: account.id });
      } else {
        const [application] = await tx.select().from(fleetApplications)
          .where(eq(fleetApplications.id, id)).for("update").limit(1);
        if (!application || application.status !== "approved") throw new Error("APPLICATION_NOT_APPROVED");
        if (application.email.toLowerCase() !== account.email.toLowerCase()) throw new Error("EMAIL_MISMATCH");
        const [fleet] = await tx.select().from(fleets)
          .where(eq(fleets.applicationId, id)).limit(1);
        if (!fleet) throw new Error("PARTNER_MISSING");
        await tx.insert(fleetMembers).values({ fleetId: fleet.id, userId: account.id });
      }

      await tx.insert(auditLog).values({
        actorId: admin.id,
        actorRole: admin.role,
        action: "isletme_hesabi_baglandi",
        entity: `${kind}_application`,
        entityId: String(id),
        meta: { userId: account.id },
      });
      return { userId: account.id };
    });
    return Response.json({ ok: true, userId: result.userId });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    if (error.message === "ACCOUNT_INVALID") return Response.json({ error: "Etkin bir müşteri hesabı bulunamadı." }, { status: 404 });
    if (error.message === "APPLICATION_NOT_APPROVED") return Response.json({ error: "Önce başvuru onaylanmalı." }, { status: 409 });
    if (error.message === "EMAIL_MISMATCH") return Response.json({ error: "Hesap e-postası başvuru e-postasıyla eşleşmiyor." }, { status: 403 });
    if (error.message === "PARTNER_MISSING") return Response.json({ error: "Onaylı iş ortağı kaydı bulunamadı." }, { status: 409 });
    if ("code" in error && error.code === "23505") return Response.json({ error: "Bu kullanıcı başka bir iş ortağına zaten bağlı." }, { status: 409 });
    throw error;
  }
}

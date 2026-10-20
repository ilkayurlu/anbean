import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, restaurantApplications } from "@/db/schema";
import { rateLimit } from "@/lib/auth";

export const dynamic = "force-dynamic";

const websiteSchema = z.string().trim().max(200).refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
});

const schema = z.object({
  businessName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().min(7).max(30).refine((value) => value.replace(/\D/g, "").length >= 10),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(300),
  cuisine: z.string().trim().min(2).max(100),
  website: websiteSchema.optional(),
  openingHours: z.string().trim().max(1000).optional(),
  kvkkConsent: z.literal(true),
  communicationConsent: z.boolean().optional(),
});

export async function POST(req: Request) {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`partner-application:restaurant:${ip}`, 5, 10 * 60_000)) {
    return Response.json({ error: "Çok fazla başvuru denemesi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz." }, { status: 400 });
  }
  const input = parsed.data;

  const application = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(restaurantApplications)
      .values({
        ...input,
        website: input.website ?? "",
        openingHours: input.openingHours ?? "",
        kvkkConsent: true,
        communicationConsent: input.communicationConsent ?? false,
      })
      .returning({ id: restaurantApplications.id });
    await tx.insert(auditLog).values({
      actorRole: "anonim",
      action: "isletme_basvurusu",
      entity: "restaurant_application",
      entityId: String(row.id),
    });
    return row;
  });

  return Response.json({ ok: true, id: application.id }, { status: 201 });
}

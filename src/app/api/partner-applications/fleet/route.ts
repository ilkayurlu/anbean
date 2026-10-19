import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { auditLog, fleetApplications } from "@/db/schema";
import { rateLimit } from "@/lib/auth";

export const dynamic = "force-dynamic";

const serviceType = z.enum(["kurye", "surucu", "arac_kiralama", "dagitim"]);
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
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().min(7).max(30).refine((value) => value.replace(/\D/g, "").length >= 10),
  serviceTypes: z.array(serviceType).min(1).max(4),
  regions: z.array(z.string().trim().min(2).max(80)).min(1).max(20),
  vehicleCountRange: z.enum(["1-5", "6-20", "21-50", "51+"]),
  website: websiteSchema.optional(),
  references: z.string().trim().max(2000).optional(),
  kvkkConsent: z.literal(true),
  communicationConsent: z.boolean().optional(),
});

export async function POST(req: Request) {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`partner-application:fleet:${ip}`, 5, 10 * 60_000)) {
    return Response.json({ error: "Çok fazla başvuru denemesi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz." }, { status: 400 });
  }
  const input = parsed.data;

  const application = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(fleetApplications)
      .values({
        ...input,
        website: input.website ?? "",
        references: input.references ?? "",
        kvkkConsent: true,
        communicationConsent: input.communicationConsent ?? false,
      })
      .returning({ id: fleetApplications.id });
    await tx.insert(auditLog).values({
      actorRole: "anonim",
      action: "isletme_basvurusu",
      entity: "fleet_application",
      entityId: String(row.id),
    });
    return row;
  });

  return Response.json({ ok: true, id: application.id }, { status: 201 });
}

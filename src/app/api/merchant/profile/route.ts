import { z } from "zod";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { requireAuth, writeAudit } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getMerchantContext } from "@/lib/partner-access";

export const dynamic = "force-dynamic";

const httpUrl = z.string().trim().max(200).refine((value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
});

const schema = z.object({
  name: z.string().trim().min(2).max(160),
  about: z.string().trim().max(2000),
  cuisine: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  address: z.string().trim().min(10).max(300),
  phone: z.string().trim().min(7).max(30).refine((value) => value.replace(/\D/g, "").length >= 10),
  website: httpUrl,
  openingHours: z.string().trim().max(1000),
  phoneVisible: z.boolean(),
  isOpen: z.boolean(),
});

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const context = await getMerchantContext(user.id);
  if (!context) return Response.json({ error: "Etkin restoran üyeliği bulunamadı." }, { status: 403 });
  const [profile] = await db.select().from(restaurants).where(eq(restaurants.id, context.restaurantId)).limit(1);
  return Response.json({ profile });
}

export async function PATCH(req: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const context = await getMerchantContext(user.id);
  if (!context) return Response.json({ error: "Etkin restoran üyeliği bulunamadı." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Profil geçersiz." }, { status: 400 });

  await db.update(restaurants).set(parsed.data).where(eq(restaurants.id, context.restaurantId));
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "restoran_profili_guncellendi",
    entity: "restaurant",
    entityId: String(context.restaurantId),
  });
  return Response.json({ ok: true });
}

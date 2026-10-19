import { z } from "zod";
import { db } from "@/db";
import { merchantCategories } from "@/db/schema";
import { requireAuth, writeAudit } from "@/lib/auth";
import { asc, eq } from "drizzle-orm";
import { getMerchantContext } from "@/lib/partner-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const context = await getMerchantContext(user.id);
  if (!context) return Response.json({ error: "Etkin restoran üyeliği bulunamadı." }, { status: 403 });
  const categories = await db.select().from(merchantCategories)
    .where(eq(merchantCategories.restaurantId, context.restaurantId))
    .orderBy(asc(merchantCategories.sortIndex), asc(merchantCategories.name));
  return Response.json({ categories });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const context = await getMerchantContext(user.id);
  if (!context) return Response.json({ error: "Etkin restoran üyeliği bulunamadı." }, { status: 403 });
  const parsed = z.object({ name: z.string().trim().min(1).max(80) }).safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Kategori adı geçersiz." }, { status: 400 });
  try {
    const [category] = await db.insert(merchantCategories)
      .values({ restaurantId: context.restaurantId, name: parsed.data.name })
      .returning();
    await writeAudit({ actorId: user.id, actorRole: user.role, action: "menu_kategorisi_olusturuldu", entity: "merchant_category", entityId: String(category.id) });
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      return Response.json({ error: "Bu kategori zaten var." }, { status: 409 });
    }
    throw error;
  }
}

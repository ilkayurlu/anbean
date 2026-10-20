import { z } from "zod";
import { db } from "@/db";
import { menuItems, merchantCategories } from "@/db/schema";
import { requireAuth, writeAudit } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { getMerchantContext } from "@/lib/partner-access";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const context = await getMerchantContext(user.id);
  if (!context) return Response.json({ error: "Etkin restoran üyeliği bulunamadı." }, { status: 403 });
  const id = Number((await params).id);
  const parsed = z.object({ name: z.string().trim().min(1).max(80), sortIndex: z.number().int().min(0).max(10_000).optional() })
    .safeParse(await req.json().catch(() => ({})));
  if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
    return Response.json({ error: "Kategori bilgileri geçersiz." }, { status: 400 });
  }
  const [category] = await db.update(merchantCategories)
    .set({ name: parsed.data.name, ...(parsed.data.sortIndex === undefined ? {} : { sortIndex: parsed.data.sortIndex }) })
    .where(and(eq(merchantCategories.id, id), eq(merchantCategories.restaurantId, context.restaurantId)))
    .returning({ id: merchantCategories.id });
  if (!category) return Response.json({ error: "Kategori bulunamadı." }, { status: 404 });
  await writeAudit({ actorId: user.id, actorRole: user.role, action: "menu_kategorisi_guncellendi", entity: "merchant_category", entityId: String(id) });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli." }, { status: 401 });
  const context = await getMerchantContext(user.id);
  if (!context) return Response.json({ error: "Etkin restoran üyeliği bulunamadı." }, { status: 403 });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return Response.json({ error: "Kategori numarası geçersiz." }, { status: 400 });
  const deleted = await db.transaction(async (tx) => {
    const [category] = await tx.select({ id: merchantCategories.id }).from(merchantCategories)
      .where(and(eq(merchantCategories.id, id), eq(merchantCategories.restaurantId, context.restaurantId))).limit(1);
    if (!category) return false;
    await tx.update(menuItems).set({ categoryId: null, category: "" })
      .where(and(eq(menuItems.categoryId, id), eq(menuItems.restaurantId, context.restaurantId)));
    await tx.delete(merchantCategories).where(eq(merchantCategories.id, id));
  });
  if (!deleted) return Response.json({ error: "Kategori bulunamadı." }, { status: 404 });
  await writeAudit({ actorId: user.id, actorRole: user.role, action: "menu_kategorisi_silindi", entity: "merchant_category", entityId: String(id) });
  return Response.json({ ok: true });
}

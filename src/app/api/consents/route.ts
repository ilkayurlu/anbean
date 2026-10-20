import { z } from "zod";
import { db } from "@/db";
import { consents } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth, writeAudit } from "@/lib/auth";
import { findPolicy } from "@/lib/policies";

export const dynamic = "force-dynamic";

const CATEGORIES = ["aydinlatma", "ticari_iletisim", "konum", "bildirim", "cerez_analitik"] as const;

const schema = z.object({
  category: z.enum(CATEGORIES),
  granted: z.boolean(),
  source: z.string().trim().max(40).optional(),
});

/** Politika sürümü, izin kaydına yazılır: hangi metin onaylandı belli olur. */
function versionFor(category: string): string {
  const slug =
    category === "ticari_iletisim"
      ? "ticari-iletisim"
      : category === "konum"
        ? "konum-verisi-aydinlatma"
        : category === "cerez_analitik"
          ? "cerez-politikasi"
          : "kvkk-aydinlatma";
  return findPolicy(slug)?.version ?? "0.1";
}

export async function GET() {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli" }, { status: 401 });

  const rows = await db
    .select()
    .from(consents)
    .where(eq(consents.userId, user.id))
    .orderBy(desc(consents.createdAt));

  // Kategori başına EN SON kayıt geçerlidir; geçmiş kayıtlar silinmez (append-only).
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.category)) latest.set(row.category, row);
  }

  return Response.json({
    current: CATEGORIES.map((category) => ({
      category,
      granted: latest.get(category)?.granted ?? false,
      policyVersion: latest.get(category)?.policyVersion ?? versionFor(category),
      updatedAt: latest.get(category)?.createdAt ?? null,
    })),
    history: rows.map((row) => ({
      id: row.id,
      category: row.category,
      granted: row.granted,
      policyVersion: row.policyVersion,
      source: row.source,
      createdAt: row.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireAuth();
  if (!user) return Response.json({ error: "Oturum gerekli" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz istek" }, { status: 400 });
  }
  const { category, granted, source } = parsed.data;

  // Aydınlatma metni onayı geri çekilemez bir "izin" değildir; yalnızca kayıt düşülür.
  await db.insert(consents).values({
    userId: user.id,
    category,
    granted,
    policyVersion: versionFor(category),
    source: source ?? "hesap-merkezi",
  });

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: granted ? "izin_verildi" : "izin_geri_cekildi",
    entity: "consent",
    entityId: category,
    meta: { policyVersion: versionFor(category) },
  });

  return Response.json({ ok: true, category, granted });
}

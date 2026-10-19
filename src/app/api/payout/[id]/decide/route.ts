import { z } from "zod";
import { db } from "@/db";
import { payoutRequests, wallets, couriers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission, writeAudit } from "@/lib/auth";
import { postLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["onayla", "reddet", "ode"]),
  note: z.string().trim().max(300).optional(),
});

/**
 * Maker-checker:
 *  - Talebi açan kişi onaylayamaz/ödeyemez (aynı userId reddedilir).
 *  - "ode" yalnızca onaylanmış talepte çalışır.
 *  - Ödeme çift taraflı kayıtla yazılır; kayıt silinemez (DB trigger'ı).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("finance:payout");
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 403 });

  const id = Number((await ctx.params).id);
  if (!Number.isFinite(id)) return Response.json({ error: "Geçersiz talep" }, { status: 400 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Geçersiz işlem" }, { status: 400 });
  const { action, note } = parsed.data;

  const [request] = await db.select().from(payoutRequests).where(eq(payoutRequests.id, id)).limit(1);
  if (!request) return Response.json({ error: "Talep bulunamadı" }, { status: 404 });

  if (request.requestedByUserId === user.id) {
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "maker_checker_ihlali_denemesi",
      entity: "payout_request",
      entityId: String(id),
      meta: { action },
    });
    return Response.json({ error: "Kendi talebinizi onaylayamaz veya ödeyemezsiniz." }, { status: 403 });
  }

  if (action === "onayla" && request.status !== "beklemede") {
    return Response.json({ error: `Bu talep zaten ${request.status}.` }, { status: 409 });
  }
  if (action === "ode" && request.status !== "onaylandi") {
    return Response.json({ error: "Yalnızca onaylanmış talep ödenebilir." }, { status: 409 });
  }
  if (action === "reddet" && request.status !== "beklemede") {
    return Response.json({ error: "Yalnızca bekleyen talep reddedilebilir." }, { status: 409 });
  }

  let txId = request.ledgerTxId;

  if (action === "ode") {
    const [courierWallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.ownerKind, "courier"), eq(wallets.ownerId, request.courierId)))
      .limit(1);
    const [systemWallet] = await db.select().from(wallets).where(eq(wallets.ownerKind, "system")).limit(1);
    if (!courierWallet || !systemWallet) {
      return Response.json({ error: "Cüzdanlar bulunamadı" }, { status: 500 });
    }
    const [courier] = await db.select().from(couriers).where(eq(couriers.id, request.courierId)).limit(1);

    try {
      const result = await postLedger({
        kind: "payout",
        idempotencyKey: `payout_${request.id}_ode`,
        refKind: "payout",
        refId: request.id,
        note: `${request.code} · ${courier?.fullName ?? "kurye"} hakediş çıkışı`,
        postings: [
          {
            walletId: courierWallet.id,
            side: "debit",
            amountKurus: request.amountKurus,
            reason: "hakedis_cikisi",
          },
          {
            walletId: systemWallet.id,
            side: "credit",
            amountKurus: request.amountKurus,
            reason: "hakedis_cikisi_odendi",
          },
        ],
      });
      txId = result.txId;
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Ödeme kaydı yazılamadı" },
        { status: 409 },
      );
    }
  }

  const status = action === "onayla" ? "onaylandi" : action === "reddet" ? "reddedildi" : "odendi";
  await db
    .update(payoutRequests)
    .set({
      status,
      approvedByUserId: user.id,
      ledgerTxId: txId,
      note: note ?? "",
      decidedAt: new Date(),
    })
    .where(eq(payoutRequests.id, id));

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: `hakedis_${action}`,
    entity: "payout_request",
    entityId: String(id),
    meta: { amountKurus: request.amountKurus, txId },
  });

  return Response.json({ ok: true, status, txId });
}

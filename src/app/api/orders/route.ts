import { z } from "zod";
import { db } from "@/db";
import { coupons, orders, wallets } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requirePermission, writeAudit } from "@/lib/auth";
import { evaluateCart, insertOrderItems, placeOrder } from "@/lib/food";
import { ensureWallet, postLedger } from "@/lib/ledger";
import { formatTry } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const schema = z.object({
  restaurantSlug: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(60),
  addressText: z.string().trim().min(10, "Teslimat adresi en az 10 karakter").max(240),
  note: z.string().trim().max(200).optional(),
  lines: z
    .array(z.object({ menuItemId: z.number().int().positive(), quantity: z.number().int().min(1).max(20) }))
    .min(1)
    .max(40),
  couponCode: z.string().trim().max(30).optional(),
  tipKurus: z.number().int().min(0).max(100_000).optional(),
  acknowledgedPrices: z.record(z.string(), z.number().int().nonnegative()).optional(),
  paymentMethod: z.enum(["bakiye", "fatura"]),
});

export async function GET() {
  const user = await requirePermission("shipment:read");
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });
  const rows = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  return Response.json({ orders: rows });
}

export async function POST(req: Request) {
  const user = await requirePermission("shipment:create");
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Sipariş bilgileri eksik" }, { status: 400 });
  }
  const input = parsed.data;

  // Onay anında her şey YENİDEN hesaplanır: stok, fiyat, kupon, bölge.
  const evaluation = await evaluateCart(input);
  if ("error" in evaluation) return Response.json({ error: evaluation.error }, { status: 404 });
  if (!evaluation.canCheckout) {
    return Response.json({ error: evaluation.issues[0].message, issues: evaluation.issues }, { status: 409 });
  }

  // Ödeme: platform bakiyesi (demo) veya kurumsal fatura.
  let charged = false;
  if (input.paymentMethod === "bakiye") {
    const wallet = await ensureWallet("user", user.id);
    if (wallet.balanceKurus < evaluation.totals.totalKurus) {
      return Response.json(
        {
          error: `Bakiye yetersiz: ${formatTry(wallet.balanceKurus)} mevcut, ${formatTry(evaluation.totals.totalKurus)} gerekli.`,
          code: "balance_insufficient",
        },
        { status: 402 },
      );
    }
    const [systemWallet] = await db.select().from(wallets).where(eq(wallets.ownerKind, "system")).limit(1);
    if (!systemWallet) return Response.json({ error: "Platform hesabı bulunamadı" }, { status: 500 });

    const delivery = await placeOrder({
      userId: user.id,
      orgId: user.orgId,
      evaluation,
      district: input.district,
      addressText: input.addressText,
      note: input.note ?? "",
      paymentMethod: input.paymentMethod,
    });

    try {
      await postLedger({
        kind: "order_charge",
        idempotencyKey: `order_${delivery.code}_charge`,
        refKind: "order",
        note: `${delivery.code} · ${evaluation.restaurant.name}`,
        postings: [
          { walletId: wallet.id, side: "debit", amountKurus: evaluation.totals.totalKurus, reason: "siparis_ucreti" },
          { walletId: systemWallet.id, side: "credit", amountKurus: evaluation.totals.totalKurus, reason: "siparis_geliri" },
        ],
      });
      charged = true;
    } catch {
      // Eşzamanlı harcama bakiyeyi düşürdüyse sipariş "ödeme bekliyor"da kalır; kayıt silinmez.
    }

    const [order] = await db
      .insert(orders)
      .values({
        code: delivery.code,
        userId: user.id,
        orgId: user.orgId,
        restaurantId: evaluation.restaurant.id,
        shipmentId: delivery.shipmentId,
        trackingToken: delivery.token,
        status: "hazirlaniyor",
        subtotalKurus: evaluation.totals.subtotalKurus,
        deliveryFeeKurus: evaluation.totals.deliveryFeeKurus,
        serviceFeeKurus: evaluation.totals.serviceFeeKurus,
        smallBasketFeeKurus: evaluation.totals.smallBasketFeeKurus,
        discountKurus: evaluation.totals.discountKurus,
        totalKurus: evaluation.totals.totalKurus,
        couponCode: evaluation.coupon?.code ?? "",
        addressText: input.addressText,
        district: input.district,
        note: input.note ?? "",
        paymentMethod: input.paymentMethod,
        financialStatus: charged ? "odendi" : "odeme_bekliyor",
      })
      .returning();

    await insertOrderItems(order.id, evaluation.lines);
    if (evaluation.coupon) {
      await db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.code, evaluation.coupon.code));
    }
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "siparis_olusturuldu",
      entity: "order",
      entityId: String(order.id),
      meta: { totalKurus: order.totalKurus, charged, coupon: evaluation.coupon?.code ?? "" },
    });

    return Response.json({
      ok: true,
      code: order.code,
      token: delivery.token,
      totalKurus: order.totalKurus,
      paid: charged,
      shipmentId: delivery.shipmentId,
    });
  }

  const delivery = await placeOrder({
    userId: user.id,
    orgId: user.orgId,
    evaluation,
    district: input.district,
    addressText: input.addressText,
    note: input.note ?? "",
    paymentMethod: input.paymentMethod,
  });
  const [order] = await db
    .insert(orders)
    .values({
      code: delivery.code,
      userId: user.id,
      orgId: user.orgId,
      restaurantId: evaluation.restaurant.id,
      shipmentId: delivery.shipmentId,
      trackingToken: delivery.token,
      status: "hazirlaniyor",
      subtotalKurus: evaluation.totals.subtotalKurus,
      deliveryFeeKurus: evaluation.totals.deliveryFeeKurus,
      serviceFeeKurus: evaluation.totals.serviceFeeKurus,
      smallBasketFeeKurus: evaluation.totals.smallBasketFeeKurus,
      discountKurus: evaluation.totals.discountKurus,
      totalKurus: evaluation.totals.totalKurus,
      couponCode: evaluation.coupon?.code ?? "",
      addressText: input.addressText,
      district: input.district,
      note: input.note ?? "",
      paymentMethod: input.paymentMethod,
      financialStatus: "fatura_bekliyor",
    })
    .returning();
  await insertOrderItems(order.id, evaluation.lines);
  // Kupon sayacı ödeme yönteminden bağımsız artar (fatura dalında atlanıyordu).
  if (evaluation.coupon) {
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.code, evaluation.coupon.code));
  }
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "siparis_olusturuldu",
    entity: "order",
    entityId: String(order.id),
    meta: { totalKurus: order.totalKurus, paymentMethod: "fatura", coupon: evaluation.coupon?.code ?? "" },
  });

  return Response.json({ ok: true, code: order.code, token: delivery.token, totalKurus: order.totalKurus, paid: false });
}

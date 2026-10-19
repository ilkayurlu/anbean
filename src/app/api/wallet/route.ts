import { requireRole, writeAudit } from "@/lib/auth";
import { ensureWallet, postLedger, verifyLedgerBalance } from "@/lib/ledger";
import { db } from "@/db";
import { wallets, ledgerEntries } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireRole(["musteri", "kurye", "ops", "admin"]);
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const wallet = await ensureWallet("user", user.id);
  const recent = await db
    .select()
    .from(ledgerEntries)
    .where(eq(ledgerEntries.walletId, wallet.id))
    .orderBy(desc(ledgerEntries.createdAt))
    .limit(15);

  return Response.json({
    walletId: wallet.id,
    balanceKurus: wallet.balanceKurus,
    currency: wallet.currency,
    recent: recent.map((r) => ({
      id: r.id,
      side: r.side,
      amountKurus: r.amountKurus,
      kind: r.kind,
      reason: r.reason,
      txId: r.txId,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireRole(["musteri", "kurye", "ops", "admin"]);
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { amountKurus?: number };
  const amount = Math.round(Number(body.amountKurus ?? 0));
  if (!(amount >= 100 && amount <= 500_000)) {
    return Response.json({ error: "Yükleme 1 - 5.000 TL arasında olmalı." }, { status: 400 });
  }

  // Sistem cüzdanı → kullanıcı cüzdanı çift taraflı kayıt
  const userWallet = await ensureWallet("user", user.id);
  const [sysWallet] = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.ownerKind, "system"), eq(wallets.ownerId, 0)))
    .limit(1);

  if (!sysWallet) {
    return Response.json({ error: "Sistem cüzdanı bulunamadı." }, { status: 500 });
  }

  try {
    const { txId } = await postLedger({
      kind: "deposit",
      idempotencyKey: `deposit_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      refKind: "topup",
      refId: user.id,
      note: `Cüzdan yükleme: ${(amount / 100).toFixed(2)} TRY`,
      postings: [
        { walletId: sysWallet.id, side: "debit", amountKurus: amount, reason: "cuzdan_yukleme" },
        { walletId: userWallet.id, side: "credit", amountKurus: amount, reason: "cuzdan_yukleme" },
      ],
    });

    const balance = await verifyLedgerBalance(txId);
    if (!balance.ok) {
      throw new Error(`Ledger dengesiz post: ${balance.debit} vs ${balance.credit}`);
    }

    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "cuzdan_yukleme",
      entity: "wallet",
      entityId: String(userWallet.id),
      meta: { amountKurus: amount, txId },
    });

    const updated = await db.select().from(wallets).where(eq(wallets.id, userWallet.id)).limit(1);
    return Response.json({ ok: true, balanceKurus: updated[0].balanceKurus, txId });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Yükleme başarısız." }, { status: 409 });
  }
}

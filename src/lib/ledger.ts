import crypto from "node:crypto";
import { db } from "@/db";
import { wallets, ledgerEntries, type LedgerEntry } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

/**
 * Platform açılış sermayesi (kuruş). Tüm cüzdan bakiyelerinin toplamı bu
 * değere eşit kalmalıdır; sapma tek taraflı kayıt yazıldığını gösterir.
 */
export const PLATFORM_OPENING_KURUS = 100_000_000;

export type EntryKind =
  | "deposit"
  | "ride_charge"
  | "ride_payout"
  | "courier_payout"
  | "guarantee_refund"
  | "shipment_charge"
  | "order_charge"
  | "payout"
  | "surge_credit"
  | "transfer_in"
  | "transfer_out"
  | "reversal";

export type Posting = {
  walletId: number;
  side: "debit" | "credit";
  amountKurus: number;
  reason: string;
};

export type LedgerTx = {
  kind: EntryKind;
  /** İşlemin her iki bacağı bu tx_id'yi paylaşır. */
  txId?: string;
  /** Aynı key iki kez işlenemez. */
  idempotencyKey?: string;
  /** Sonradan ölçülen ücretlerde (sürüş) bakiye eksiye düşebilir. */
  allowOverdraft?: boolean;
  refKind?: string;
  refId?: number;
  note?: string;
  postings: Posting[];
};

/**
 * Çift taraflı kayıt.
 * Kural: Her işlem dengeli olmalı — sum(debit) = sum(credit).
 * Dengesiz posting reddedilir (silent fail değil, throw).
 * Append-only: kayıt silinmez; hata reversal entry ile düzeltilir.
 */
export async function postLedger(input: LedgerTx): Promise<{ txId: string; entries: LedgerEntry[] }> {
  const totalDebit = input.postings
    .filter((p) => p.side === "debit")
    .reduce((sum, p) => sum + p.amountKurus, 0);
  const totalCredit = input.postings
    .filter((p) => p.side === "credit")
    .reduce((sum, p) => sum + p.amountKurus, 0);

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Ledger dengesiz: debit=${totalDebit} != credit=${totalCredit}. Master prompt kuralı — dengeli kayıt zorunlu.`,
    );
  }
  if (totalDebit <= 0) throw new Error("Ledger tutarı sıfır olamaz.");
  if (input.postings.some((p) => p.amountKurus < 0)) throw new Error("Negatif tutar yasak.");

  // Idempotency: aynı anahtar daha önce yazıldıysa mevcut tx'i döndür.
  if (input.idempotencyKey && input.idempotencyKey.length > 0) {
    const existing = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing[0]) {
      const siblings = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.txId, existing[0].txId));
      return { txId: existing[0].txId, entries: siblings };
    }
  }

  const txId = input.txId ?? `tx_${crypto.randomBytes(12).toString("hex")}`;
  // Idempotency key yalnızca ilk posting'de yazılır — diğerleri aynı tx'in bacağıdır.
  let idemUsed = false;

  // Wallet varlığını ve yeterli bakiye (debit tarafı) kontrol et.
  const debitWallets = new Set(input.postings.filter((p) => p.side === "debit").map((p) => p.walletId));
  if (debitWallets.size > 0 && !input.allowOverdraft) {
    const rows = await db
      .select()
      .from(wallets)
      .where(inArray(wallets.id, Array.from(debitWallets)));
    const map = new Map(rows.map((r) => [r.id, r.balanceKurus]));
    const requiredByWallet = new Map<number, number>();
    for (const posting of input.postings) {
      if (posting.side !== "debit") continue;
      requiredByWallet.set(posting.walletId, (requiredByWallet.get(posting.walletId) ?? 0) + posting.amountKurus);
    }
    for (const [walletId, required] of requiredByWallet) {
      const balance = map.get(walletId) ?? 0;
      if (balance < required) {
        throw new Error(
          `Yetersiz bakiye: cüzdan #${walletId} — ${balance} < ${required}. İstemciye fiyat bilgisi sızdırılmaz.`,
        );
      }
    }
  }

  // Kayıtları ve bakiye güncellemesini atomik olarak yaz.
  const entries = await db.transaction(async (tx) => {
    const written: LedgerEntry[] = [];
    for (const posting of input.postings) {
      // İlk posting kullanıcının verdiği idempotency_key'i taşır (tekrar koruması),
      // diğerleri aynı tx'in bacağıdır ve kendi unique key'lerini alır.
      const keyForThis = !idemUsed && input.idempotencyKey
        ? input.idempotencyKey
        : `${txId}_${posting.walletId}_${posting.side}`;
      idemUsed = true;
      const [row] = await tx
        .insert(ledgerEntries)
        .values({
          walletId: posting.walletId,
          side: posting.side,
          amountKurus: posting.amountKurus,
          reason: posting.reason,
          kind: input.kind,
          txId,
          idempotencyKey: keyForThis,
          refKind: input.refKind ?? "",
          refId: input.refId ?? null,
          note: input.note ?? "",
        })
        .returning();
      written.push(row);
    }

    // Bakiye güncellemesi — aynı tx içinde.
    const netByWallet = new Map<number, number>();
    for (const posting of input.postings) {
      const delta = posting.side === "credit" ? posting.amountKurus : -posting.amountKurus;
      netByWallet.set(posting.walletId, (netByWallet.get(posting.walletId) ?? 0) + delta);
    }
    for (const [walletId, delta] of netByWallet) {
      await tx
        .update(wallets)
        .set({ balanceKurus: sql`${wallets.balanceKurus} + ${delta}` })
        .where(eq(wallets.id, walletId));
    }
    return written;
  });

  return { txId, entries };
}

/** Ledger doğrulaması: verilen tx_id dengeli mi? */
export async function verifyLedgerBalance(txId: string): Promise<{ ok: boolean; debit: number; credit: number }> {
  const rows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.txId, txId));
  const debit = rows.filter((r) => r.side === "debit").reduce((sum, r) => sum + r.amountKurus, 0);
  const credit = rows.filter((r) => r.side === "credit").reduce((sum, r) => sum + r.amountKurus, 0);
  return { ok: debit === credit, debit, credit };
}

/** Belirli bir işlemin ters kaydını aç — kayıt silinmez, reversal eklenir. */
export async function reverseLedger(txId: string, reason: string, idempotencyKey: string) {
  const rows = await db.select().from(ledgerEntries).where(eq(ledgerEntries.txId, txId));
  if (rows.length === 0) throw new Error("Tersine çevrilecek işlem yok.");

  const reversed: Posting[] = rows.map((row) => ({
    walletId: row.walletId,
    side: row.side === "debit" ? "credit" : "debit",
    amountKurus: row.amountKurus,
    reason: `${reason} (ters: ${row.reason})`,
  }));

  return postLedger({
    kind: "reversal",
    idempotencyKey,
    postings: reversed,
    note: `Orijinal tx: ${txId}`,
  });
}

export async function ensureWallet(ownerKind: string, ownerId: number, currency = "TRY") {
  const existing = await db
    .select()
    .from(wallets)
    .where(and(eq(wallets.ownerKind, ownerKind), eq(wallets.ownerId, ownerId)))
    .limit(1);
  if (existing[0]) return existing[0];
  const [row] = await db
    .insert(wallets)
    .values({ ownerKind, ownerId, currency, balanceKurus: 0 })
    .returning();
  return row;
}

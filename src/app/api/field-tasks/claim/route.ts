import { db } from "@/db";
import { fieldTasks, couriers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole, writeAudit } from "@/lib/auth";
import { ensureWallet, postLedger } from "@/lib/ledger";
import { wallets } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Kurye görevi sahiplenir — aktif teslimat yokken ölü saati doldurur. */
export async function POST(req: Request) {
  const user = await requireRole(["kurye", "ops", "admin"]);
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { taskId?: number };
  const taskId = Number(body.taskId);
  if (!Number.isFinite(taskId)) return Response.json({ error: "Geçersiz görev" }, { status: 400 });

  const [task] = await db.select().from(fieldTasks).where(eq(fieldTasks.id, taskId)).limit(1);
  if (!task) return Response.json({ error: "Görev bulunamadı" }, { status: 404 });
  if (task.status !== "acik") {
    return Response.json({ error: `Görev durumu: ${task.status}` }, { status: 409 });
  }

  const [courier] = await db.select().from(couriers).where(eq(couriers.userId, user.id)).limit(1);
  if (!courier) return Response.json({ error: "Kurye profili yok" }, { status: 403 });

  await db
    .update(fieldTasks)
    .set({
      assignedCourierId: courier.id,
      status: "atandi",
    })
    .where(eq(fieldTasks.id, taskId));

  // Hakediş anında kurye cüzdanına işlenir (Moat #4 — anlık şeffaf hakediş).
  if (task.rewardKurus > 0) {
    const courierWallet = await ensureWallet("courier", courier.id);
    const [sysWallet] = await db.select().from(wallets).where(eq(wallets.ownerKind, "system")).limit(1);
    if (sysWallet) {
      await postLedger({
        kind: "courier_payout",
        idempotencyKey: `task_${task.id}_claim`,
        refKind: "field_task",
        refId: task.id,
        note: `Saha görevi sahiplenildi: ${task.kind}`,
        postings: [
          { walletId: sysWallet.id, side: "debit", amountKurus: task.rewardKurus, reason: "saha_odeme" },
          { walletId: courierWallet.id, side: "credit", amountKurus: task.rewardKurus, reason: "saha_hakedis" },
        ],
      });
    }
  }

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "saha_gorevi_sahiplenildi",
    entity: "field_task",
    entityId: String(task.id),
    meta: { courierId: courier.id, rewardKurus: task.rewardKurus },
  });

  return Response.json({ ok: true });
}

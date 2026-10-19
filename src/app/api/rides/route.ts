import { db } from "@/db";
import { iotVehicles, rides, wallets, fieldTasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireRole, writeAudit } from "@/lib/auth";
import { ensureWallet, postLedger, verifyLedgerBalance } from "@/lib/ledger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await requireRole(["musteri", "admin"]);
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { vehicleCode?: string; lat?: number; lng?: number };
  if (!body.vehicleCode) {
    return Response.json({ error: "Araç kodu gerekli" }, { status: 400 });
  }

  const [vehicle] = await db.select().from(iotVehicles).where(eq(iotVehicles.code, body.vehicleCode)).limit(1);
  if (!vehicle) return Response.json({ error: "Araç bulunamadı" }, { status: 404 });
  if (vehicle.status !== "available") {
    return Response.json({ error: `Araç kullanılamaz: ${vehicle.status}` }, { status: 409 });
  }
  if (vehicle.batteryPercent < 20) {
    return Response.json({ error: "Batarya %20 altında — bu araç kiralanamaz." }, { status: 409 });
  }

  // İstemci asla fiyat hesaplamaz — sunucu tarafında.
  const riderWallet = await ensureWallet("user", user.id);
  if (riderWallet.balanceKurus < vehicle.perMinuteKurus) {
    return Response.json({ error: "Sürüş başlatmak için cüzdan bakiyesi yetersiz." }, { status: 409 });
  }

  const year = new Date().getFullYear();
  const countRow = await db.select({ n: sql`count(*)` }).from(rides);
  const n = Number(countRow[0]?.n ?? 0) + 1001;
  const code = `RIDE-${year}-${String(n).padStart(6, "0")}`;

  const [ride] = await db
    .insert(rides)
    .values({
      code,
      vehicleId: vehicle.id,
      riderId: user.id,
      startLat: body.lat ?? vehicle.lastLat ?? null,
      startLng: body.lng ?? vehicle.lastLng ?? null,
      surgeMultiplier: 1.0,
    })
    .returning();

  // Araç kilidi açıldı — sunucu tarafında doğrulanmış.
  await db
    .update(iotVehicles)
    .set({ status: "in_use", locked: false, lastSeenAt: new Date() })
    .where(eq(iotVehicles.id, vehicle.id));

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "surus_baslatildi",
    entity: "ride",
    entityId: String(ride.id),
    meta: { vehicleCode: vehicle.code },
  });

  return Response.json({ ok: true, rideId: ride.id, rideCode: ride.code, vehicleCode: vehicle.code });
}

export async function DELETE(req: Request) {
  const user = await requireRole(["musteri", "admin"]);
  if (!user) return Response.json({ error: "Yetkisiz" }, { status: 401 });

  const url = new URL(req.url);
  const rideId = Number(url.searchParams.get("rideId"));
  if (!Number.isFinite(rideId)) return Response.json({ error: "Geçersiz sürüş" }, { status: 400 });

  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride || ride.status !== "aktif") {
    return Response.json({ error: "Bu sürüş zaten sonlandırılmış." }, { status: 409 });
  }
  if (ride.riderId !== user.id && user.role !== "admin") {
    return Response.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const [vehicle] = await db.select().from(iotVehicles).where(eq(iotVehicles.id, ride.vehicleId)).limit(1);
  if (!vehicle) return Response.json({ error: "Araç bulunamadı" }, { status: 404 });

  const endedAt = new Date();
  const durationSeconds = Math.max(1, Math.round((endedAt.getTime() - new Date(ride.startedAt).getTime()) / 1000));
  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
  const priceKurus = Math.round(minutes * vehicle.perMinuteKurus * ride.surgeMultiplier);

  // Çift taraflı kayıt: kullanıcı cüzdanından sistem cüzdanına.
  const userWallet = await ensureWallet("user", user.id);
  const [sysWallet] = await db.select().from(wallets).where(eq(wallets.ownerKind, "system")).limit(1);
  if (!sysWallet) return Response.json({ error: "Sistem cüzdanı yok." }, { status: 500 });

  try {
    await postLedger({
      kind: "ride_charge",
      // Sürüş süresi önceden bilinmez: bakiye yetmese de sürüş biter ve araç kilitlenir.
      // Eksi bakiyede yeni sürüş başlatılamaz (POST'taki bakiye kontrolü).
      allowOverdraft: true,
      idempotencyKey: `ride_${ride.id}_charge`,
      refKind: "ride",
      refId: ride.id,
      note: `${durationSeconds}s · ${minutes} dk · ₺${(priceKurus / 100).toFixed(2)}`,
      postings: [
        { walletId: userWallet.id, side: "debit", amountKurus: priceKurus, reason: "surus_ucreti" },
        { walletId: sysWallet.id, side: "credit", amountKurus: priceKurus, reason: "surus_geliri" },
      ],
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Ücret alınamadı." }, { status: 409 });
  }

  await db
    .update(rides)
    .set({
      status: "tamamlandi",
      endedAt,
      durationSeconds,
      priceKurus,
      distanceKm: (durationSeconds / 60) * 0.4,
    })
    .where(eq(rides.id, ride.id));

  await db
    .update(iotVehicles)
    .set({
      status: "available",
      locked: true,
      batteryPercent: Math.max(0, vehicle.batteryPercent - Math.round(durationSeconds / 60)),
      lastSeenAt: endedAt,
    })
    .where(eq(iotVehicles.id, vehicle.id));

  // Batarya %30 altındaysa otomatik saha görevi oluştur (Moat #2).
  const current = await db.select().from(iotVehicles).where(eq(iotVehicles.id, vehicle.id)).limit(1);
  if (current[0] && current[0].batteryPercent < 30) {
    const existingTask = await db
      .select()
      .from(fieldTasks)
      .where(eq(fieldTasks.vehicleId, vehicle.id))
      .limit(1);
    if (existingTask.length === 0) {
      await db.insert(fieldTasks).values({
        code: `TASK-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000 + 100000))}`,
        kind: "batarya_degisimi",
        vehicleId: vehicle.id,
        status: "acik",
        priority: "acil",
        lat: current[0].lastLat ?? 41.0,
        lng: current[0].lastLng ?? 29.0,
        district: vehicle.district,
        rewardKurus: 2500,
        notes: `Sürüş sonrası batarya %${current[0].batteryPercent}.`,
      });
    }
  }

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "surus_tamamlandi",
    entity: "ride",
    entityId: String(ride.id),
    meta: { priceKurus, durationSeconds },
  });

  return Response.json({ ok: true, priceKurus, durationSeconds });
}

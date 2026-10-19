import { db } from "@/db";
import { iotVehicles, fieldTasks, wallets, geoFences, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { ensureWallet, PLATFORM_OPENING_KURUS } from "./ledger";

let ran = false;

/**
 * Süper-app demo verisi — idempotent.
 * - 6 araç (scooter/e-bike) 2 bölgede
 * - 2 saha görevi (batarya değişimi + arızalı toplama)
 * - 1 basit geo-fence (no-park)
 * - Her kullanıcı için cüzdan
 */
export async function ensureFleetSeed(): Promise<void> {
  if (ran) return;

  const existing = await db.select().from(iotVehicles).limit(1);
  if (existing.length > 0) {
    ran = true;
    return;
  }

  // Araçlar
  const vehicles = [
    { kind: "scooter", code: "ANB-S0001", batteryPercent: 92, lat: 40.9901, lng: 29.0275, district: "Kadıköy", zoneCode: "IST-A" },
    { kind: "scooter", code: "ANB-S0002", batteryPercent: 64, lat: 40.9922, lng: 29.0301, district: "Kadıköy", zoneCode: "IST-A" },
    { kind: "scooter", code: "ANB-S0003", batteryPercent: 28, lat: 41.0422, lng: 29.0094, district: "Beşiktaş", zoneCode: "IST-A", status: "low_battery" },
    { kind: "ebike", code: "ANB-E0001", batteryPercent: 88, lat: 41.0451, lng: 29.0122, district: "Beşiktaş", zoneCode: "IST-A" },
    { kind: "ebike", code: "ANB-E0002", batteryPercent: 75, lat: 41.0138, lng: 28.9497, district: "Şişli", zoneCode: "IST-A" },
    { kind: "moped", code: "ANB-M0001", batteryPercent: 55, lat: 41.0088, lng: 28.9784, district: "Beyoğlu", zoneCode: "IST-A", status: "maintenance" },
  ];

  const insertedVehicles = await db.insert(iotVehicles).values(vehicles).returning();

  // Saha görevleri (hibrit filo Moat #2)
  const lowBattery = insertedVehicles.find((v) => v.code === "ANB-S0003");
  const maintenance = insertedVehicles.find((v) => v.code === "ANB-M0001");

  if (lowBattery) {
    await db.insert(fieldTasks).values({
      code: "TASK-2026-001001",
      kind: "batarya_degisimi",
      vehicleId: lowBattery.id,
      status: "acik",
      priority: "acil",
      lat: lowBattery.lastLat ?? 41.0422,
      lng: lowBattery.lastLng ?? 29.0094,
      district: "Beşiktaş",
      rewardKurus: 2500,
      notes: "Batarya %28 altında. Ölü saatte bu görevi alana ek gelir.",
    });
  }
  if (maintenance) {
    await db.insert(fieldTasks).values({
      code: "TASK-2026-001002",
      kind: "ariza_toplama",
      vehicleId: maintenance.id,
      status: "acik",
      priority: "normal",
      lat: maintenance.lastLat ?? 41.0088,
      lng: maintenance.lastLng ?? 28.9784,
      district: "Beyoğlu",
      rewardKurus: 4000,
      notes: "Araç bakım için toplanacak. En yakın kurye alabilir.",
    });
  }

  // Basit no-park geo-fence (Taksim çevresi)
  await db.insert(geoFences).values({
    name: "Taksim Yayalaştırma",
    kind: "no_park",
    city: "İstanbul",
    polygon: [
      [
        [28.978, 41.036],
        [28.988, 41.036],
        [28.988, 41.041],
        [28.978, 41.041],
        [28.978, 41.036],
      ],
    ],
    isActive: true,
  });

  // Surge bölgesi (Kadıköy vapur iskelesi çevresi — yoğun saat)
  await db.insert(geoFences).values({
    name: "Kadıköy Yoğun Saat",
    kind: "surge",
    city: "İstanbul",
    polygon: [
      [
        [29.02, 40.988],
        [29.035, 40.988],
        [29.035, 40.995],
        [29.02, 40.995],
        [29.02, 40.988],
      ],
    ],
    surgeMultiplier: 1.4,
    isActive: true,
  });

  // Her kullanıcı için cüzdan
  const allUsers = await db.select().from(users);
  for (const u of allUsers) {
    await ensureWallet("user", u.id);
  }

  // Kurye cüzdanları (hakediş için)
  await ensureWallet("courier", 1);
  await ensureWallet("courier", 2);
  await ensureWallet("courier", 3);

  // Sistem cüzdanı (platform tarafı) — çift taraflı ledger'da debit kaynağıdır.
  // Başlangıç sermayesi 1M TL (100M kuruş) — deposit ve hakediş akışları için.
  const sys = await db.select().from(wallets).where(eq(wallets.ownerKind, "system")).limit(1);
  if (sys.length === 0) {
    await db.insert(wallets).values({ ownerKind: "system", ownerId: 0, balanceKurus: PLATFORM_OPENING_KURUS });
  }

  ran = true;
}

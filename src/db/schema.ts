import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  doublePrecision,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Faz 1 — Çekirdek                                                    */
/* ------------------------------------------------------------------ */

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  taxNumber: text("tax_number"),
  type: text("type").notNull().default("bireysel"), // bireysel | isletme | kurumsal
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    // musteri | kurye | ops | finance | support | admin
    role: text("role").notNull().default("musteri"),
    orgId: integer("org_id").references(() => organizations.id),
    // scrypt hash'i. Doluysa giriş bununla doğrulanır.
    passwordHash: text("password_hash"),
    isActive: boolean("is_active").notNull().default(true),
    isBanned: boolean("is_banned").notNull().default(false),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    kvkkConsentAt: timestamp("kvkk_consent_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note").notNull().default(""),
    actorId: integer("actor_id").references(() => users.id),
    actorRole: text("actor_role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const serviceZones = pgTable("service_zones", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  zoneCode: text("zone_code").notNull(),
  surchargeKurus: integer("surcharge_kurus").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const tariffs = pgTable("tariffs", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // sehir_ici | ekspres | kurumsal
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  baseKurus: integer("base_kurus").notNull(),
  perKmKurus: integer("per_km_kurus").notNull(),
  perKgKurus: integer("per_kg_kurus").notNull(),
  slaMinutes: integer("sla_minutes").notNull().default(240),
  accentStatus: text("accent_status").notNull().default("transit"),
  isActive: boolean("is_active").notNull().default(true),
});

export const shipments = pgTable(
  "shipments",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // AB-2026-000123
    orgId: integer("org_id").references(() => organizations.id),
    createdByUserId: integer("created_by_user_id").references(() => users.id),
    tariffCode: text("tariff_code").notNull().default("sehir_ici"),

    status: text("status").notNull().default("taslak"),
    financialStatus: text("financial_status").notNull().default("fatura_bekliyor"),

    senderName: text("sender_name").notNull(),
    senderPhone: text("sender_phone").notNull(),
    pickupCity: text("pickup_city").notNull(),
    pickupDistrict: text("pickup_district").notNull(),
    pickupAddress: text("pickup_address").notNull(),

    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    dropCity: text("drop_city").notNull(),
    dropDistrict: text("drop_district").notNull(),
    dropAddress: text("drop_address").notNull(),

    weightGrams: integer("weight_grams").notNull().default(1000),
    distanceKm: doublePrecision("distance_km").notNull().default(5),
    priceKurus: integer("price_kurus").notNull().default(0),
    notes: text("notes").notNull().default(""),

    assignedCourierId: integer("assigned_courier_id"),
    preferredCourierId: integer("preferred_courier_id"),
    etaAt: timestamp("eta_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    // İstisna çözüm saati — rakipte 1 saat, bizde 5 dakika taahhüdü
    exceptionAt: timestamp("exception_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("shipments_status_idx").on(t.status), index("shipments_org_idx").on(t.orgId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    targetType: text("target_type").notNull(),
    targetId: integer("target_id").notNull(),
    orderId: integer("order_id").references(() => orders.id),
    fleetTaskId: integer("fleet_task_id").references(() => fleetTasks.id),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    stars: integer("stars").notNull(),
    comment: text("comment").notNull().default(""),
    status: text("status").notNull().default("pending"),
    flagged: boolean("flagged").notNull().default(false),
    moderatedByUserId: integer("moderated_by_user_id").references(() => users.id),
    moderatedAt: timestamp("moderated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("reviews_order_target_uq").on(t.orderId, t.targetType, t.targetId),
    uniqueIndex("reviews_fleet_task_target_uq").on(t.fleetTaskId, t.targetType, t.targetId),
    index("reviews_target_status_idx").on(t.targetType, t.targetId, t.status),
  ],
);

export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: serial("id").primaryKey(),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note").notNull().default(""),
    district: text("district").notNull().default(""),
    actorRole: text("actor_role").notNull().default("sistem"),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("shipment_events_shipment_idx").on(t.shipmentId)],
);

export const trackingTokens = pgTable(
  "tracking_tokens",
  {
    id: serial("id").primaryKey(),
    token: text("token").notNull().unique(),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    hitCount: integer("hit_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id"),
  actorRole: text("actor_role").notNull().default("anonim"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull().default(""),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Faz 5 — Operasyon                                                   */
/* ------------------------------------------------------------------ */

export const couriers = pgTable("couriers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull().default("İstanbul"),
  vehicle: text("vehicle").notNull().default("motosiklet"),
  // basvuru | evrak_bekliyor | aktif | pasif
  status: text("status").notNull().default("basvuru"),
  shiftModel: text("shift_model").notNull().default("sozlesmeli"),
  activeLoad: integer("active_load").notNull().default(0),
  ratingSum: integer("rating_sum").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  lastLat: doublePrecision("last_lat"),
  lastLng: doublePrecision("last_lng"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id")
    .notNull()
    .references(() => shipments.id, { onDelete: "cascade" }),
  courierId: integer("courier_id")
    .notNull()
    .references(() => couriers.id, { onDelete: "cascade" }),
  // beklemede | teklif_edildi | kabul | red | iptal | tamamlandi
  status: text("status").notNull().default("teklif_edildi"),
  offeredAt: timestamp("offered_at", { withTimezone: true }).notNull().defaultNow(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export const proofOfDeliveries = pgTable("proof_of_deliveries", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id")
    .notNull()
    .references(() => shipments.id, { onDelete: "cascade" }),
  receivedBy: text("received_by").notNull(),
  method: text("method").notNull().default("imza"), // imza | foto | kod
  code: text("code").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Destek — CMS, medya slotları, bildirim                              */
/* ------------------------------------------------------------------ */

export const mediaSlots = pgTable("media_slots", {
  id: serial("id").primaryKey(),
  slotKey: text("slot_key").notNull().unique(),
  query: text("query").notNull(),
  kind: text("kind").notNull().default("foto"),
  providerId: text("provider_id").notNull().default(""),
  url: text("url").notNull().default(""),
  // Video slotları için zorunlu poster — ilk kare ve "hareketi azalt" yedeği
  posterUrl: text("poster_url").notNull().default(""),
  credit: text("credit").notNull().default("Pexels"),
  fallbackCss: text("fallback_css").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
});

export const cmsPages = pgTable("cms_pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  status: text("status").notNull().default("yayinda"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").references(() => shipments.id, { onDelete: "cascade" }),
  channel: text("channel").notNull().default("sms"),
  template: text("template").notNull(),
  maskedTarget: text("masked_target").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courierApplications = pgTable("courier_applications", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull(),
  vehicle: text("vehicle").notNull(),
  experience: text("experience").notNull().default(""),
  status: text("status").notNull().default("yeni"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const restaurantApplications = pgTable(
  "restaurant_applications",
  {
    id: serial("id").primaryKey(),
    businessName: text("business_name").notNull(),
    contactName: text("contact_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    district: text("district").notNull(),
    address: text("address").notNull(),
    cuisine: text("cuisine").notNull(),
    website: text("website").notNull().default(""),
    openingHours: text("opening_hours").notNull().default(""),
    kvkkConsent: boolean("kvkk_consent").notNull(),
    communicationConsent: boolean("communication_consent").notNull().default(false),
    status: text("status").notNull().default("submitted"),
    reviewReason: text("review_reason").notNull().default(""),
    reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("restaurant_applications_status_idx").on(t.status, t.createdAt)],
);

export const fleetApplications = pgTable(
  "fleet_applications",
  {
    id: serial("id").primaryKey(),
    companyName: text("company_name").notNull(),
    contactName: text("contact_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    serviceTypes: jsonb("service_types").$type<string[]>().notNull().default([]),
    regions: jsonb("regions").$type<string[]>().notNull().default([]),
    vehicleCountRange: text("vehicle_count_range").notNull(),
    website: text("website").notNull().default(""),
    references: text("references").notNull().default(""),
    kvkkConsent: boolean("kvkk_consent").notNull(),
    communicationConsent: boolean("communication_consent").notNull().default(false),
    status: text("status").notNull().default("submitted"),
    reviewReason: text("review_reason").notNull().default(""),
    reviewedByUserId: integer("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("fleet_applications_status_idx").on(t.status, t.createdAt)],
);

/**
 * Teslimat Güvencesi — SLA aşılırsa otomatik iade kredisi.
 * Rakipte böyle bir taahhüt yok; bizim agresif karşı hamlemiz.
 */
export const slaCredits = pgTable("sla_credits", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id")
    .notNull()
    .references(() => shipments.id, { onDelete: "cascade" }),
  // gecikme | basarisiz_teslimat | manuel
  reason: text("reason").notNull(),
  amountKurus: integer("amount_kurus").notNull(),
  ratePercent: integer("rate_percent").notNull().default(0),
  // otomatik_onaylandi | odendi | reddedildi
  status: text("status").notNull().default("otomatik_onaylandi"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Kurye şeffaflığı — teslim sonrası puan, kurye profilinde görünür. */
export const courierRatings = pgTable(
  "courier_ratings",
  {
    id: serial("id").primaryKey(),
    courierId: integer("courier_id")
      .notNull()
      .references(() => couriers.id, { onDelete: "cascade" }),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("courier_ratings_shipment_uq").on(t.shipmentId)],
);

export type Shipment = typeof shipments.$inferSelect;
export type SlaCredit = typeof slaCredits.$inferSelect;

/* ------------------------------------------------------------------ */
/* Faz 8 — Çift Taraflı Ledger & Cüzdan                                */
/*                                                                     */
/* Master prompt kuralı:                                               */
/*   - bigint kuruş hassasiyeti (kalan int32 ile ~20M TL — yeterli)    */
/*   - append-only, ters kayıt ile iptal, silme YOK                    */
/*   - her işlem dengeli: sum(debit_kurus) = sum(credit_kurus)         */
/* ------------------------------------------------------------------ */

export const wallets = pgTable(
  "wallets",
  {
    id: serial("id").primaryKey(),
    ownerKind: text("owner_kind").notNull(), // user | courier | org | system
    ownerId: integer("owner_id").notNull(),
    currency: text("currency").notNull().default("TRY"),
    balanceKurus: integer("balance_kurus").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("wallets_owner_uq").on(t.ownerKind, t.ownerId)],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: serial("id").primaryKey(),
    walletId: integer("wallet_id")
      .notNull()
      .references(() => wallets.id),
    // debit | credit
    side: text("side").notNull(),
    amountKurus: integer("amount_kurus").notNull(),
    reason: text("reason").notNull(),
    // deposit | ride_charge | ride_payout | courier_payout | guarantee_refund | surge_credit | transfer_in | transfer_out | reversal
    kind: text("kind").notNull(),
    // Aynı işlemin iki bacağı aynı tx_id'yi taşır — denetimde dengeli doğrulanır.
    txId: text("tx_id").notNull(),
    // Webhook ve ödeme tekrarları için — aynı anahtar iki kez işlenemez.
    idempotencyKey: text("idempotency_key").notNull().default(""),
    refKind: text("ref_kind").notNull().default(""), // shipment | ride | field_task | topup
    refId: integer("ref_id"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ledger_entries_idem_uq").on(t.idempotencyKey),
    index("ledger_entries_tx_idx").on(t.txId),
    index("ledger_entries_wallet_idx").on(t.walletId),
  ],
);

/* ------------------------------------------------------------------ */
/* Faz 5 — Mikro-Mobilite IoT & Filo                                   */
/*                                                                     */
/* Gerçek BLE kilidi sandbox'ta simüle edilir. Şema, kilit aç/kapa     */
/* akışının tamamını sunucu tarafında doğrular (istemci asla tek       */
/* başına kilidi açamaz).                                              */
/* ------------------------------------------------------------------ */

export const iotVehicles = pgTable(
  "iot_vehicles",
  {
    id: serial("id").primaryKey(),
    // scooter | ebike | moped | cargo_bike
    kind: text("kind").notNull(),
    code: text("code").notNull().unique(), // ANB-E0012
    qr: text("qr").notNull().default(""),
    // available | in_use | reserved | maintenance | low_battery | disabled
    status: text("status").notNull().default("available"),
    batteryPercent: integer("battery_percent").notNull().default(85),
    rangeKm: doublePrecision("range_km").notNull().default(35),
    lastLat: doublePrecision("last_lat"),
    lastLng: doublePrecision("last_lng"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    city: text("city").notNull().default("İstanbul"),
    district: text("district").notNull().default(""),
    zoneCode: text("zone_code").notNull().default("IST-A"),
    // per_minute_kurus (dinamik surge uygulandığında güncellenir)
    perMinuteKurus: integer("per_minute_kurus").notNull().default(400),
    // Simüle edilmiş IoT kilit durumu — gerçek kilit için MQTT/HTTPS callback
    locked: boolean("locked").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("iot_vehicles_status_idx").on(t.status)],
);

export const vehicleTelemetry = pgTable(
  "vehicle_telemetry",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => iotVehicles.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    speedKph: doublePrecision("speed_kph").notNull().default(0),
    batteryPercent: integer("battery_percent").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vehicle_telemetry_vehicle_idx").on(t.vehicleId)],
);

export const rides = pgTable(
  "rides",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // RIDE-2026-001001
    vehicleId: integer("vehicle_id")
      .notNull()
      .references(() => iotVehicles.id),
    riderId: integer("rider_id").notNull().references(() => users.id),
    // aktif | tamamlandi | iptal | sorunlu
    status: text("status").notNull().default("aktif"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    distanceKm: doublePrecision("distance_km").notNull().default(0),
    priceKurus: integer("price_kurus").notNull().default(0),
    startLat: doublePrecision("start_lat"),
    startLng: doublePrecision("start_lng"),
    endLat: doublePrecision("end_lat"),
    endLng: doublePrecision("end_lng"),
    // AI doğrulamalı park kanıtı (küratörlü signed URL)
    parkProofUrl: text("park_proof_url").notNull().default(""),
    parkProofScore: doublePrecision("park_proof_score").notNull().default(0),
    surgeMultiplier: doublePrecision("surge_multiplier").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rides_rider_idx").on(t.riderId), index("rides_vehicle_idx").on(t.vehicleId)],
);

/* ------------------------------------------------------------------ */
/* Faz 6 — Saha Görevleri (Hibrit Filo)                                */
/*                                                                     */
/* Master prompt Moat #2: kurye aktif teslimat yokken batarya          */
/* değişimi / arızalı araç toplama yaparak ölü saati sıfırlar.         */
/* ------------------------------------------------------------------ */

export const fieldTasks = pgTable(
  "field_tasks",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // TASK-2026-001001
    // batarya_degisimi | ariza_toplama | arac_yeniden_konumlandirma | kontrol
    kind: text("kind").notNull(),
    vehicleId: integer("vehicle_id").references(() => iotVehicles.id),
    assignedCourierId: integer("assigned_courier_id").references(() => couriers.id),
    // acik | atandi | baslandi | tamamlandi | iptal
    status: text("status").notNull().default("acik"),
    // acil | normal | planli
    priority: text("priority").notNull().default("normal"),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    district: text("district").notNull().default(""),
    rewardKurus: integer("reward_kurus").notNull().default(0),
    notes: text("notes").notNull().default(""),
    proofUrl: text("proof_url").notNull().default(""),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("field_tasks_status_idx").on(t.status)],
);

/* ------------------------------------------------------------------ */
/* Faz 5 — Dinamik Geo-Fence                                           */
/*                                                                     */
/* Polygon + etki alanı. Gerçek H3 indeksleme yerine basit polygon     */
/* kontrolü (MVP). H3 genişlemesi additive — tabloya hex kolonu eklenir. */
/* ------------------------------------------------------------------ */

export const geoFences = pgTable("geo_fences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // speed_limit | no_park | surge | promo | service
  kind: text("kind").notNull(),
  city: text("city").notNull().default("İstanbul"),
  // GeoJSON polygon koordinatları
  polygon: jsonb("polygon").$type<number[][][]>().notNull().default([[]]),
  speedKph: integer("speed_kph"),
  surgeMultiplier: doublePrecision("surge_multiplier"),
  activeFrom: timestamp("active_from", { withTimezone: true }),
  activeUntil: timestamp("active_until", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Wallet = typeof wallets.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type IotVehicle = typeof iotVehicles.$inferSelect;
export type FieldTask = typeof fieldTasks.$inferSelect;
export type Ride = typeof rides.$inferSelect;
export type GeoFence = typeof geoFences.$inferSelect;

/* ------------------------------------------------------------------ */
/* Destek, hakediş çıkışı ve şifre sıfırlama                           */
/*                                                                     */
/* Tamamı additive: mevcut tabloların sütunları ve tip'leri değişmedi.  */
/* ------------------------------------------------------------------ */

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    orgId: integer("org_id").references(() => organizations.id),
    shipmentId: integer("shipment_id").references(() => shipments.id),
    rideId: integer("ride_id").references(() => rides.id),
    // teslimat_sorunu | odeme | arac_sorunu | sikayet | diger
    category: text("category").notNull().default("diger"),
    subject: text("subject").notNull(),
    // acik | isleniyor | cozuldu | kapatildi
    status: text("status").notNull().default("acik"),
    priority: text("priority").notNull().default("normal"),
    assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("support_tickets_user_idx").on(t.userId), index("support_tickets_status_idx").on(t.status)],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: serial("id").primaryKey(),
    ticketId: integer("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorId: integer("author_id").references(() => users.id),
    authorRole: text("author_role").notNull().default("musteri"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ticket_messages_ticket_idx").on(t.ticketId)],
);

/**
 * Hakediş çıkışı — maker-checker.
 * Talebi açan ile onaylayan aynı kişi olamaz; onayda çift taraflı kayıt yazılır.
 */
export const payoutRequests = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  courierId: integer("courier_id")
    .notNull()
    .references(() => couriers.id),
  amountKurus: integer("amount_kurus").notNull(),
  ibanMasked: text("iban_masked").notNull().default(""),
  // beklemede | onaylandi | odendi | reddedildi
  status: text("status").notNull().default("beklemede"),
  requestedByUserId: integer("requested_by_user_id").references(() => users.id),
  approvedByUserId: integer("approved_by_user_id").references(() => users.id),
  ledgerTxId: text("ledger_tx_id").notNull().default(""),
  note: text("note").notNull().default(""),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Ham token saklanmaz, yalnızca sha256 özeti.
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Yemek dikeyi — pilot katalog                                        */
/*                                                                     */
/* Gerçek restoran iş ortağı yok; katalog is_demo=true ile işaretli ve  */
/* arayüzde her yerde "pilot/demo" olarak etiketlenir. Sahte puan ve    */
/* yorum alanı bilinçli olarak YOKTUR.                                  */
/* ------------------------------------------------------------------ */

export const restaurants = pgTable(
  "restaurants",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    cuisine: text("cuisine").notNull().default(""),
    city: text("city").notNull().default("İstanbul"),
    district: text("district").notNull().default(""),
    isOpen: boolean("is_open").notNull().default(true),
    minBasketKurus: integer("min_basket_kurus").notNull().default(0),
    deliveryFeeKurus: integer("delivery_fee_kurus").notNull().default(0),
    serviceFeeKurus: integer("service_fee_kurus").notNull().default(0),
    smallBasketFeeKurus: integer("small_basket_fee_kurus").notNull().default(0),
    prepMinutes: integer("prep_minutes").notNull().default(25),
    about: text("about").notNull().default(""),
    phone: text("phone").notNull().default(""),
    website: text("website").notNull().default(""),
    address: text("address").notNull().default(""),
    openingHours: text("opening_hours").notNull().default(""),
    phoneVisible: boolean("phone_visible").notNull().default(false),
    // Pilot katalog: arayüzde "demo" rozeti zorunlu, structured data üretilmez.
    isDemo: boolean("is_demo").notNull().default(true),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("restaurants_district_idx").on(t.district)],
);

export const merchantCategories = pgTable(
  "merchant_categories",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("merchant_categories_restaurant_name_uq").on(t.restaurantId, t.name)],
);

export const merchants = pgTable("merchants", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .unique()
    .references(() => restaurantApplications.id),
  slug: text("slug").notNull().unique(),
  businessName: text("business_name").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const merchantMembers = pgTable(
  "merchant_members",
  {
    id: serial("id").primaryKey(),
    merchantId: integer("merchant_id")
      .notNull()
      .references(() => merchants.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("merchant_members_merchant_user_uq").on(t.merchantId, t.userId),
    uniqueIndex("merchant_members_user_uq").on(t.userId),
  ],
);

export const fleets = pgTable("fleets", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id")
    .notNull()
    .unique()
    .references(() => fleetApplications.id),
  slug: text("slug").notNull().unique(),
  companyName: text("company_name").notNull(),
  about: text("about").notNull().default(""),
  phone: text("phone").notNull().default(""),
  website: text("website").notNull().default(""),
  serviceTypes: jsonb("service_types").$type<string[]>().notNull().default([]),
  regions: jsonb("regions").$type<string[]>().notNull().default([]),
  contractStatus: text("contract_status").notNull().default("pending"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fleetMembers = pgTable(
  "fleet_members",
  {
    id: serial("id").primaryKey(),
    fleetId: integer("fleet_id")
      .notNull()
      .references(() => fleets.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fleet_members_fleet_user_uq").on(t.fleetId, t.userId),
    uniqueIndex("fleet_members_user_uq").on(t.userId),
  ],
);

export const fleetVehicles = pgTable(
  "fleet_vehicles",
  {
    id: serial("id").primaryKey(),
    fleetId: integer("fleet_id")
      .notNull()
      .references(() => fleets.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    vehicleType: text("vehicle_type").notNull(),
    registration: text("registration").notNull().default(""),
    status: text("status").notNull().default("available"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("fleet_vehicles_fleet_idx").on(t.fleetId),
    uniqueIndex("fleet_vehicles_registration_uq").on(t.fleetId, t.registration),
  ],
);

export const fleetCouriers = pgTable(
  "fleet_couriers",
  {
    id: serial("id").primaryKey(),
    fleetId: integer("fleet_id")
      .notNull()
      .references(() => fleets.id, { onDelete: "cascade" }),
    courierId: integer("courier_id")
      .notNull()
      .references(() => couriers.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("fleet_couriers_fleet_courier_uq").on(t.fleetId, t.courierId)],
);

export const fleetTasks = pgTable(
  "fleet_tasks",
  {
    id: serial("id").primaryKey(),
    fleetId: integer("fleet_id")
      .notNull()
      .references(() => fleets.id),
    shipmentId: integer("shipment_id")
      .notNull()
      .references(() => shipments.id),
    assignedCourierId: integer("assigned_courier_id").references(() => couriers.id),
    status: text("status").notNull().default("assigned"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("fleet_tasks_shipment_uq").on(t.shipmentId),
    index("fleet_tasks_fleet_status_idx").on(t.fleetId, t.status),
  ],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    category: text("category").notNull().default(""),
    categoryId: integer("category_id").references(() => merchantCategories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceKurus: integer("price_kurus").notNull(),
    isAvailable: boolean("is_available").notNull().default(true),
    stockQuantity: integer("stock_quantity"),
    allergens: text("allergens").notNull().default(""),
    sortIndex: integer("sort_index").notNull().default(0),
  },
  (t) => [index("menu_items_restaurant_idx").on(t.restaurantId)],
);

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  // yuzde | tutar
  kind: text("kind").notNull().default("tutar"),
  value: integer("value").notNull().default(0),
  minBasketKurus: integer("min_basket_kurus").notNull().default(0),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  usageLimit: integer("usage_limit").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    orgId: integer("org_id").references(() => organizations.id),
    restaurantId: integer("restaurant_id")
      .notNull()
      .references(() => restaurants.id),
    // Sipariş teslimatı mevcut gönderi altyapısına bağlanır: şerit ve takip ortak.
    shipmentId: integer("shipment_id").references(() => shipments.id),
    trackingToken: text("tracking_token").notNull().default(""),
    status: text("status").notNull().default("olusturuldu"),
    subtotalKurus: integer("subtotal_kurus").notNull().default(0),
    deliveryFeeKurus: integer("delivery_fee_kurus").notNull().default(0),
    serviceFeeKurus: integer("service_fee_kurus").notNull().default(0),
    smallBasketFeeKurus: integer("small_basket_fee_kurus").notNull().default(0),
    discountKurus: integer("discount_kurus").notNull().default(0),
    totalKurus: integer("total_kurus").notNull().default(0),
    couponCode: text("coupon_code").notNull().default(""),
    addressText: text("address_text").notNull().default(""),
    district: text("district").notNull().default(""),
    note: text("note").notNull().default(""),
    paymentMethod: text("payment_method").notNull().default("bakiye"),
    financialStatus: text("financial_status").notNull().default("odeme_bekliyor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  },
  (t) => [index("orders_user_idx").on(t.userId)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    menuItemId: integer("menu_item_id").references(() => menuItems.id),
    name: text("name").notNull(),
    unitPriceKurus: integer("unit_price_kurus").notNull(),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** İzin/rıza kayıtları — append-only, sürüm ve kaynak bilgisiyle. */
export const consents = pgTable(
  "consents",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // aydinlatma | ticari_iletisim | konum | bildirim | cerez_analitik
    category: text("category").notNull(),
    granted: boolean("granted").notNull(),
    policyVersion: text("policy_version").notNull().default("1.0"),
    source: text("source").notNull().default("hesap-merkezi"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("consents_user_idx").on(t.userId, t.category)],
);

export type SupportTicket = typeof supportTickets.$inferSelect;
export type Restaurant = typeof restaurants.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type TicketMessage = typeof ticketMessages.$inferSelect;
export type PayoutRequest = typeof payoutRequests.$inferSelect;
export type ShipmentEvent = typeof shipmentEvents.$inferSelect;
export type Courier = typeof couriers.$inferSelect;
export type Tariff = typeof tariffs.$inferSelect;
export type MediaSlot = typeof mediaSlots.$inferSelect;

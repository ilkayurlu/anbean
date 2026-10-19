import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark, SiteFooter } from "@/components/SiteChrome";
import StatusStrip, { StatusPill } from "@/components/StatusStrip";
import EtaCounter from "@/components/EtaCounter";
import RouteMap from "@/components/RouteMap";
import GuaranteeBadge from "@/components/GuaranteeBadge";
import LiveStatus from "@/components/LiveStatus";
import DeliveredBurst from "@/components/DeliveredBurst";
import { getShipmentByToken } from "@/lib/shipments";
import { maskName, statusColor, statusDef, STRIP_SEGMENTS } from "@/lib/status";
import {
  creditsForShipment,
  evaluateGuarantee,
  minutesLate,
  resolutionSecondsLeft,
  GUARANTEE,
} from "@/lib/guarantee";
import { db } from "@/db";
import { couriers } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return { title: `Takip ${token.slice(0, 6)}… — Anbean` };
}

function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function TrackResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const result = await getShipmentByToken(clean);
  if (!result) notFound();

  const { shipment, events } = result;
  const def = statusDef(shipment.status);
  const progress = Math.min(def.stage / STRIP_SEGMENTS.length, 1);
  const done = shipment.status === "teslim_edildi";

  // Güvence okuma anında da değerlendirilir: SLA sessizce aşılmışsa
  // müşteri sayfayı açtığında kredi çoktan işlenmiş olur (idempotent).
  await evaluateGuarantee(shipment.id);
  const credits = await creditsForShipment(shipment.id);
  const late = minutesLate(shipment.etaAt, shipment.deliveredAt);
  const resolutionLeft = resolutionSecondsLeft(shipment.exceptionAt, shipment.resolvedAt);

  // Kurye şeffaflığı: yalnızca ad + puan. Soyad, telefon, foto paylaşılmaz.
  const courierRows = shipment.assignedCourierId
    ? await db.select().from(couriers).where(eq(couriers.id, shipment.assignedCourierId)).limit(1)
    : [];
  const courier = courierRows[0];
  const courierScore = courier && courier.ratingCount > 0 ? courier.ratingSum / courier.ratingCount : null;

  return (
    <div className="min-h-screen bg-deep">
      <header className="border-b border-white/8 px-5 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-white">
            <BrandMark size="sm" />
          </Link>
          <Link href="/takip" className="text-sm text-slate-400 transition hover:text-white">
            Başka kod sorgula
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Gönderi</p>
            <h1 className="font-display text-2xl font-bold text-white">{shipment.code}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LiveStatus token={clean} status={shipment.status} eventCount={events.length} />
            <StatusPill status={shipment.status} dark />
          </div>
        </div>

        {/* İMZA: Durum Renk Şeridi */}
        <div className="relative mt-7 rounded-lg border border-white/10 bg-white/3 p-6">
          {done ? <DeliveredBurst token={clean} /> : null}
          <StatusStrip status={shipment.status} size="lg" showLabels animated />
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Tahmini teslim</p>
              <div className="mt-1.5">
                <EtaCounter etaIso={shipment.etaAt ? new Date(shipment.etaAt).toISOString() : null} done={done} />
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Rota</p>
              <p className="mt-2 text-base text-slate-200">
                {shipment.pickupDistrict} → {shipment.dropDistrict}
              </p>
              <p className="text-xs text-slate-500">{shipment.pickupCity}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Alıcı</p>
              <p className="mt-2 text-base text-slate-200">{maskName(shipment.recipientName)}</p>
              <p className="text-xs text-slate-500">Adres ve telefon gizlenir</p>
            </div>
          </div>

          {courier ? (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/8 pt-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent">
                {courier.fullName.charAt(0)}
              </span>
              <div>
                <p className="text-sm text-slate-200">
                  Kuryen {courier.fullName.split(" ")[0]} · {courier.vehicle}
                </p>
                <p className="text-xs text-slate-500">
                  {courierScore
                    ? `${courierScore.toFixed(1)} / 5 · ${courier.ratingCount} değerlendirme`
                    : "Henüz değerlendirme yok"}{" "}
                  · Soyad, telefon ve fotoğraf paylaşılmaz
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {resolutionLeft !== null ? (
          <div
            className="mt-6 rounded-lg border p-5"
            style={{
              borderColor: resolutionLeft > 0 ? "rgba(245,158,11,0.45)" : "rgba(220,38,38,0.45)",
              backgroundColor: resolutionLeft > 0 ? "rgba(245,158,11,0.10)" : "rgba(220,38,38,0.10)",
            }}
          >
            <p className="text-sm font-semibold text-white">
              Bu gönderi istisna kuyruğunda — çözüm taahhüdümüz {GUARANTEE.resolutionSlaMinutes} dakika
            </p>
            <p className="mt-1.5 text-sm text-slate-300">
              {resolutionLeft > 0
                ? `Operasyon ekibi çözüm üretiyor. Kalan süre: ${Math.floor(resolutionLeft / 60)} dk ${resolutionLeft % 60} sn.`
                : "Taahhüt süresi aşıldı; gönderi önceliklendirildi ve güvence kredisi otomatik işlendi."}
            </p>
          </div>
        ) : null}

        <div className="mt-6">
          <GuaranteeBadge credits={credits} minutesLate={late} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <RouteMap
            fromDistrict={shipment.pickupDistrict}
            toDistrict={shipment.dropDistrict}
            currentDistrict={events[0]?.district ?? shipment.pickupDistrict}
            progress={progress}
          />

          <div className="rounded-lg border border-white/10 bg-white/3 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Hareket geçmişi</h2>
            <ol className="mt-5 space-y-5">
              {events.map((event, index) => {
                const color = statusColor(event.status);
                return (
                  <li key={event.id} className="relative pl-7">
                    {index !== events.length - 1 ? (
                      <span className="absolute top-4 left-[7px] h-full w-px bg-white/12" />
                    ) : null}
                    <span
                      className="absolute top-1 left-0 h-3.5 w-3.5 rounded-full border-2"
                      style={{ borderColor: color, backgroundColor: index === 0 ? color : "transparent" }}
                    />
                    <p className="text-sm font-semibold text-slate-100">{statusDef(event.status).label}</p>
                    <p className="text-xs text-slate-400">{event.note}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {formatTime(event.createdAt)} · {event.district}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-white/8 bg-white/3 p-5 text-sm text-slate-400">
          Bu sayfa herkese açıktır ve kişisel veri içermez. Teslimat talimatı değiştirmek için{" "}
          <Link href="/iletisim" className="text-accent underline-offset-4 hover:underline">
            destek ekibine
          </Link>{" "}
          ulaşın.
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

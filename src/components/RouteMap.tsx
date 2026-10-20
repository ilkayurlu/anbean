import { STATUS_COLOR } from "@/lib/status";

/**
 * İlçe seviyesi şematik rota. Kesin adres yok, yalnızca ilçe düğümleri (KVKK).
 * Mapbox yerine SVG: token ve ücret yok, ek JS yok; gizlilik tasarımın kendisinde.
 * Rota çizgisi açılışta çizilerek gelir, kurye düğümü nabız atar (CSS).
 */
const ROUTE = "M60 150 C 180 150, 200 70, 320 70 S 480 130, 540 90";
const SPLIT = 0.55; // ilk eğrinin toplam yol uzunluğundaki yaklaşık payı

type Pt = { x: number; y: number };

function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

function pointOnRoute(p: number): Pt {
  if (p <= SPLIT) {
    return bezier({ x: 60, y: 150 }, { x: 180, y: 150 }, { x: 200, y: 70 }, { x: 320, y: 70 }, p / SPLIT);
  }
  return bezier({ x: 320, y: 70 }, { x: 440, y: 70 }, { x: 480, y: 130 }, { x: 540, y: 90 }, (p - SPLIT) / (1 - SPLIT));
}

export default function RouteMap({
  fromDistrict,
  toDistrict,
  currentDistrict,
  progress,
}: {
  fromDistrict: string;
  toDistrict: string;
  currentDistrict: string;
  progress: number; // 0..1
}) {
  const p = Math.min(Math.max(progress, 0), 1);
  const pin = pointOnRoute(p);
  const moving = p > 0 && p < 1;

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0a101c]">
      <svg
        viewBox="0 0 600 220"
        className="h-52 w-full"
        role="img"
        aria-label={`${fromDistrict} ilçesinden ${toDistrict} ilçesine rota, yaklaşık yüzde ${Math.round(p * 100)} tamamlandı`}
      >
        <defs>
          <pattern id="route-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="600" height="220" fill="url(#route-grid)" />
        <path d={ROUTE} stroke="rgba(148,163,184,0.3)" strokeWidth="3" fill="none" strokeLinecap="round" />
        {p > 0 ? (
          <path
            d={ROUTE}
            pathLength={600}
            className="route-draw stroke-accent"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="600"
            strokeDashoffset={600 - p * 600}
          />
        ) : null}
        <circle cx="60" cy="150" r="7" fill={STATUS_COLOR.waiting} />
        <circle cx="540" cy="90" r="7" fill={STATUS_COLOR.delivered} />
        {moving ? (
          <g>
            <circle cx={pin.x} cy={pin.y} r="9" className="pin-pulse fill-accent" />
            <circle cx={pin.x} cy={pin.y} r="8" className="fill-accent" />
            <circle cx={pin.x} cy={pin.y} r="3" fill="#0B1220" />
          </g>
        ) : null}
        <text x="60" y="180" fill="#94a3b8" fontSize="13" textAnchor="middle">
          {fromDistrict}
        </text>
        <text x="540" y="120" fill="#94a3b8" fontSize="13" textAnchor="middle">
          {toDistrict}
        </text>
      </svg>
      <div className="flex items-center justify-between border-t border-white/8 px-4 py-2.5 text-[11px] text-slate-500">
        <span>Son bilinen bölge: {currentDistrict || fromDistrict}</span>
        <span>İlçe hassasiyeti · şematik görünüm</span>
      </div>
    </div>
  );
}

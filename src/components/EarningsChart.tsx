import { STATUS_COLOR } from "@/lib/status";

/**
 * Günlük kazanç çubuğu — elle çizilmiş SVG.
 * Recharts yerine: ~40 satır, sıfır bağımlılık, ~0 KB istemci JS.
 * (Recharts gzip ~100 KB; bu çubuklar için gereksiz.)
 */
export default function EarningsChart({
  data,
  formatValue,
  height = 160,
}: {
  data: { label: string; value: number }[];
  formatValue: (value: number) => string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / Math.max(data.length, 1);

  return (
    <div>
      <svg
        viewBox={`0 0 100 ${height / 4}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`Günlük kazanç grafiği. En yüksek gün ${formatValue(max)}.`}
      >
        {data.map((point, index) => {
          const h = (point.value / max) * (height / 4 - 8);
          return (
            <g key={point.label}>
              <rect
                x={index * barWidth + barWidth * 0.18}
                y={height / 4 - h}
                width={barWidth * 0.64}
                height={Math.max(h, 0.6)}
                rx={0.6}
                fill={STATUS_COLOR.delivered}
                opacity={0.35 + (0.65 * point.value) / max}
              />
              <title>{`${point.label}: ${formatValue(point.value)}`}</title>
            </g>
          );
        })}
        <line x1="0" y1={height / 4 - 0.4} x2="100" y2={height / 4 - 0.4} stroke="#cbd5e1" strokeWidth="0.3" />
      </svg>
      <div className="mt-2 flex">
        {data.map((point) => (
          <span key={point.label} className="flex-1 truncate text-center text-[10px] text-slate-500">
            {point.label}
          </span>
        ))}
      </div>
      {data.every((d) => d.value === 0) ? (
        <p className="mt-2 text-center text-xs text-slate-500">Seçilen dönemde kazanç kaydı yok.</p>
      ) : null}
    </div>
  );
}

import { STATUS_COLOR, STRIP_SEGMENTS, statusDef } from "@/lib/status";

type Props = {
  status: string;
  /** sm: satır içi liste, md: kart, lg: takip sonucu / hero */
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  animated?: boolean;
  className?: string;
};

const HEIGHT = { sm: "h-1.5", md: "h-2.5", lg: "h-4" } as const;

/**
 * ANBEAN imza mekaniği.
 * Tamamlanan segmentler dolu, gelecek segmentler soluk.
 * Hero, /takip/[token], müşteri listesi, kurye görev kartı ve ops panelinde
 * AYNI bileşen olarak kullanılır — rakipten ayrışmanın taşıyıcısı budur.
 */
export default function StatusStrip({
  status,
  size = "md",
  showLabels = false,
  animated = false,
  className = "",
}: Props) {
  const def = statusDef(status);
  const stage = def.stage;
  const exceptional = def.kind === "risk" || def.kind === "return";

  return (
    <div className={className}>
      <div className={`flex w-full gap-1 ${HEIGHT[size]}`}>
        {STRIP_SEGMENTS.map((segment, index) => {
          const position = index + 1;
          const done = stage >= position;
          const current = stage === position;
          const color = exceptional && current ? STATUS_COLOR[def.kind] : STATUS_COLOR[segment.kind];
          return (
            <div
              key={segment.key}
              className="relative flex-1 overflow-hidden rounded-[3px]"
              style={{ backgroundColor: done ? color : "rgba(148,163,184,0.22)" }}
              title={segment.label}
            >
              {current && animated ? (
                <span
                  className="absolute inset-0 animate-pulse"
                  style={{ backgroundColor: color, opacity: 0.55 }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {showLabels ? (
        <div className="mt-2 flex w-full gap-1">
          {STRIP_SEGMENTS.map((segment, index) => (
            <span
              key={segment.key}
              className={`flex-1 truncate text-[10px] uppercase tracking-[0.08em] ${
                stage >= index + 1 ? "text-slate-200" : "text-slate-500"
              }`}
            >
              {segment.short}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function StatusPill({ status, dark = false }: { status: string; dark?: boolean }) {
  const def = statusDef(status);
  const color = STATUS_COLOR[def.kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        color,
        backgroundColor: `${color}1f`,
        border: `1px solid ${color}${dark ? "55" : "33"}`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {def.label}
    </span>
  );
}

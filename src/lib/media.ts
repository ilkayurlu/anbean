import { db } from "@/db";
import { mediaSlots } from "@/db/schema";

export type ResolvedSlot = {
  slotKey: string;
  url: string | null;
  kind: string;
  posterUrl: string | null;
  credit: string;
  fallbackCss: string;
};

const DEFAULT_FALLBACK =
  "linear-gradient(135deg, #0b1220 0%, #111b2e 55%, color-mix(in oklab, var(--accent) 32%, transparent) 100%)";

/** Slotlar sabit sağlayıcı ID ile kilitlidir; build'de görsel değişmez. */
export async function getMediaSlots(): Promise<Record<string, ResolvedSlot>> {
  try {
    const rows = await db.select().from(mediaSlots);
    const map: Record<string, ResolvedSlot> = {};
    for (const row of rows) {
      map[row.slotKey] = {
        slotKey: row.slotKey,
        url: row.isActive && row.url ? row.url : null,
        kind: row.kind,
        posterUrl: row.isActive && row.posterUrl ? row.posterUrl : null,
        credit: row.credit,
        fallbackCss: row.fallbackCss || DEFAULT_FALLBACK,
      };
    }
    return map;
  } catch {
    return {};
  }
}

export function slotOrFallback(
  slots: Record<string, ResolvedSlot>,
  key: string,
): ResolvedSlot {
  return slots[key] ?? { slotKey: key, url: null, kind: "foto", posterUrl: null, credit: "Pexels", fallbackCss: DEFAULT_FALLBACK };
}

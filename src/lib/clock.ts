/**
 * Sunucu bileşenlerinde "şimdi" ihtiyacı.
 * Bu modül bileşen/hook içermediği için render saflığı kuralı burada
 * geçerli değil; dinamik (force-dynamic) sayfalarda anlık zaman okumak
 * meşrudur — sayaçlar ve uyarı eşikleri buna bağlı.
 */
export function nowMillis(): number {
  return Date.now();
}

export function nowDate(): Date {
  return new Date();
}

export function minutesAgo(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  return Math.round((nowMillis() - new Date(value).getTime()) / 60_000);
}

export function dayKey(value: Date | string): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Son N günün etiketleri (bugün dahil, eskiden yeniye). */
export function lastDays(count: number): { label: string; key: string }[] {
  const base = nowMillis();
  const out: { label: string; key: string }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(base - i * 86_400_000);
    out.push({
      label: new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(d),
      key: dayKey(d),
    });
  }
  return out;
}

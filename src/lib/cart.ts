"use client";

export type CartLine = { menuItemId: number; quantity: number };
export type CartState = { version: 1; restaurantSlug: string; lines: CartLine[] };

const KEY = "anbean:sepet:v1";

/** Sepet tarayıcıda saklanır: sekme kapanınca kaybolmaz (kurtarma davranışı). */
export function readCart(): CartState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartState;
    if (parsed.version !== 1 || !parsed.restaurantSlug || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCart(cart: CartState | null) {
  try {
    if (!cart || cart.lines.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("anbean:cart"));
  } catch {
    // özel mod / depolama kapalı: sepet bellekte yaşar, kalıcı olmaz
  }
}

export function addToCart(restaurantSlug: string, menuItemId: number, quantity = 1): CartState {
  const current = readCart();
  // İşletmeler arası birleştirme YOK: farklı işletme seçilince sepet sıfırlanır.
  const base: CartState =
    current && current.restaurantSlug === restaurantSlug ? current : { version: 1, restaurantSlug, lines: [] };
  const existing = base.lines.find((line) => line.menuItemId === menuItemId);
  const lines = existing
    ? base.lines.map((line) =>
        line.menuItemId === menuItemId
          ? { ...line, quantity: Math.min(line.quantity + quantity, 20) }
          : line,
      )
    : [...base.lines, { menuItemId, quantity: Math.min(quantity, 20) }];
  const next = { ...base, lines };
  writeCart(next);
  return next;
}

export function setQuantity(restaurantSlug: string, menuItemId: number, quantity: number) {
  const current = readCart();
  if (!current || current.restaurantSlug !== restaurantSlug) return;
  const lines =
    quantity <= 0
      ? current.lines.filter((line) => line.menuItemId !== menuItemId)
      : current.lines.map((line) =>
          line.menuItemId === menuItemId ? { ...line, quantity: Math.min(quantity, 20) } : line,
        );
  writeCart({ ...current, lines });
}

export function clearCart() {
  writeCart(null);
}

export function cartCount(): number {
  const cart = readCart();
  return cart ? cart.lines.reduce((sum, line) => sum + line.quantity, 0) : 0;
}

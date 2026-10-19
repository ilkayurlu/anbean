"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus, ShoppingBasket } from "lucide-react";
import { addToCart, cartCount, readCart, setQuantity } from "@/lib/cart";

/**
 * Menü satırı için sepet denetimi. Dokunma hedefi 44px+.
 * Başka işletmenin ürünü eklenirse sepet sıfırlanır ve kullanıcı uyarılır:
 * işletmeler arası birleştirme desteklenmiyor.
 */
export default function AddToCartButton({
  restaurantSlug,
  menuItemId,
  available,
}: {
  restaurantSlug: string;
  menuItemId: number;
  available: boolean;
}) {
  const router = useRouter();
  const [quantity, setLocalQuantity] = useState(() => {
    const cart = typeof window === "undefined" ? null : readCart();
    return cart && cart.restaurantSlug === restaurantSlug
      ? (cart.lines.find((line) => line.menuItemId === menuItemId)?.quantity ?? 0)
      : 0;
  });
  const [conflict, setConflict] = useState(false);

  if (!available) {
    return (
      <span className="inline-flex h-11 items-center rounded-md border border-white/10 px-4 text-xs text-slate-500">
        Tükendi
      </span>
    );
  }

  function bump(delta: number) {
    const current = readCart();
    if (current && current.restaurantSlug !== restaurantSlug && current.lines.length > 0) {
      setConflict(true);
      return;
    }
    const next = Math.max(0, quantity + delta);
    if (delta > 0) addToCart(restaurantSlug, menuItemId, delta);
    else setQuantity(restaurantSlug, menuItemId, next);
    setLocalQuantity(next);
    router.refresh();
  }

  function resolveConflict(keep: boolean) {
    if (keep) {
      addToCart(restaurantSlug, menuItemId, 1);
      setLocalQuantity(1);
    }
    setConflict(false);
    router.refresh();
  }

  if (quantity === 0) {
    return (
      <>
        <button
          type="button"
          onClick={() => bump(1)}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft"
        >
          <Plus size={16} aria-hidden /> Ekle
        </button>
        {conflict ? <ConflictDialog onCancel={() => resolveConflict(false)} onReplace={() => resolveConflict(true)} /> : null}
      </>
    );
  }

  return (
    <div className="inline-flex h-11 items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-1">
      <button
        type="button"
        onClick={() => bump(-1)}
        aria-label="Bir azalt"
        className="flex h-9 w-9 items-center justify-center rounded-sm text-accent transition hover:bg-accent/15"
      >
        <Minus size={16} aria-hidden />
      </button>
      <span className="min-w-6 text-center font-display text-sm font-bold text-white tabular-nums">{quantity}</span>
      <button
        type="button"
        onClick={() => bump(1)}
        aria-label="Bir arttır"
        className="flex h-9 w-9 items-center justify-center rounded-sm text-accent transition hover:bg-accent/15"
      >
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );
}

function ConflictDialog({ onCancel, onReplace }: { onCancel: () => void; onReplace: () => void }) {
  return (
    <div
      role="alertdialog"
      aria-label="Sepet başka bir işletmeye ait"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-lg border border-white/15 bg-[#0b1220] p-5 shadow-xl"
    >
      <p className="text-sm font-semibold text-white">Sepetin başka bir işletmeden</p>
      <p className="mt-1.5 text-sm text-slate-400">
        İşletmeler arası sepet birleştirmiyoruz. Bu ürünü eklemek için mevcut sepetin boşaltılacak.
        ({cartCount()} ürün)
      </p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onReplace}
          className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-[#0B1220]"
        >
          Sepeti değiştir
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-md border border-white/15 px-4 py-2.5 text-sm text-slate-300"
        >
          Vazgeç
        </button>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
        <ShoppingBasket size={12} aria-hidden /> Mevcut sepeti korumak istersen önce onu tamamla.
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBasket } from "lucide-react";
import { cartCount } from "@/lib/cart";

/** Sepet rozeti: depoyu dinler, başka sekmede değişirse güncellenir. */
export default function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = () => setCount(cartCount());
    load();
    window.addEventListener("anbean:cart", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("anbean:cart", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  return (
    <Link
      href="/sepet"
      className="relative flex h-9 w-9 items-center justify-center rounded-md border border-white/12 text-slate-300 transition hover:border-white/30 hover:text-white"
      aria-label={count > 0 ? `Sepet, ${count} ürün` : "Sepet"}
    >
      <ShoppingBasket size={16} aria-hidden />
      {count > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-[#0B1220]">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Compass, HeartHandshake, Home, ReceiptText, UserRound, type LucideIcon } from "lucide-react";
import { isNavHidden, useMode } from "./ModeProvider";

type Item = { href: string; label: string; Icon: LucideIcon; match: (p: string) => boolean };

const ITEMS: Item[] = [
  { href: "/", label: "Ana Sayfa", Icon: Home, match: (p) => p === "/" },
  {
    href: "/yemek",
    label: "Keşfet",
    Icon: Compass,
    match: (p) => p.startsWith("/yemek") || p.startsWith("/sepet") || p.startsWith("/yolculuk") || p.startsWith("/gonder"),
  },
  {
    href: "/app",
    label: "İşlemlerim",
    Icon: ReceiptText,
    match: (p) => p.startsWith("/app") || p.startsWith("/takip/"),
  },
  { href: "/app/destek", label: "Destek", Icon: HeartHandshake, match: (p) => p === "/app/destek" || p === "/yardim" },
  { href: "/hesap/izinler", label: "Hesabım", Icon: UserRound, match: (p) => p.startsWith("/hesap") || p.startsWith("/giris") },
];

/**
 * Mobil alt gezinme: 5 alan, 56px dokunma hedefi.
 * Gösterge layoutId ile kayar; renk aktif modun aksanından gelir.
 */
export default function MobileNav() {
  const pathname = usePathname() ?? "/";
  const { mode } = useMode();
  if (isNavHidden(pathname)) return null;

  return (
    <nav
      aria-label="Mobil gezinme"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0b1220]/94 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold"
              >
                {active ? (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute top-0 h-0.5 w-7 rounded-full bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                ) : null}
                <Icon
                  size={21}
                  strokeWidth={active ? 2.2 : 1.7}
                  aria-hidden
                  className={active ? "text-accent" : "text-slate-400"}
                />
                <span className={active ? "text-white" : "text-slate-500"}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <span className="sr-only">{mode === "sur" ? "Sür modu" : "Gönder modu"}</span>
    </nav>
  );
}

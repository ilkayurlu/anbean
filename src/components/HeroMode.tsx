"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bike, Package, type LucideIcon } from "lucide-react";
import { useMode, type Mode } from "./ModeProvider";

const OPTIONS: { mode: Mode; label: string; Icon: LucideIcon }[] = [
  { mode: "gonder", label: "Gönder", Icon: Package },
  { mode: "sur", label: "Sür", Icon: Bike },
];

/**
 * Gönder / Sür anahtarı. Gösterge layoutId ile kayar; aktif olan ikon
 * dönerek belirir (Lottie dosyası olmadan "morph" hissi). Renk geçişini
 * CSS yapar: buradaki tek iş data-mode'u değiştirmek.
 */
export function ModeSwitch() {
  const { mode, setMode } = useMode();

  return (
    <div className="inline-flex rounded-[10px] border border-white/12 bg-white/5 p-1" role="group" aria-label="Hizmet modu">
      {OPTIONS.map(({ mode: value, label, Icon }) => {
        const active = value === mode;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setMode(value)}
            className={`relative flex items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
              active ? "text-[#0B1220]" : "text-slate-300 hover:text-white"
            }`}
          >
            {active ? (
              <motion.span
                layoutId="mode-indicator"
                className="absolute inset-0 rounded-md bg-accent"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            ) : null}
            <span className="relative flex items-center gap-2">
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span
                  key={active ? "on" : "off"}
                  className="flex"
                  initial={{ rotate: -90, scale: 0.4, opacity: 0 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  exit={{ rotate: 90, scale: 0.4, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <Icon size={16} strokeWidth={active ? 2.4 : 1.8} aria-hidden />
                </motion.span>
              </AnimatePresence>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Moda göre içerik değiştirir. initial={false}: ilk boyamada animasyon yok,
 * böylece sunucu HTML'i tam görünür gelir ve LCP gecikmez.
 */
export function ModePanels({ gonder, sur, className = "" }: { gonder: ReactNode; sur: ReactNode; className?: string }) {
  const { mode } = useMode();

  return (
    <div className={`relative ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {mode === "gonder" ? gonder : sur}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

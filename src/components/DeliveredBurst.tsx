"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

// Şerit segmentlerinden "kırıntılar": marka diliyle aynı küçük dikdörtgenler.
const COLORS = ["var(--accent)", "#16A34A", "#F59E0B", "#2563EB"];
const COUNT = 18;

/**
 * Teslim anı mikro-sevinci (Lottie yerine Motion; After Effects dosyası yok).
 * Oturum başına gönderi başına bir kez oynar; "hareketi azalt" tercihinde hiç
 * oynamaz. Sunucuda ve ilk istemci boyamasında null döner: hidrasyon temiz.
 */
export default function DeliveredBurst({ token }: { token: string }) {
  const reduce = useReducedMotion();
  const [play, setPlay] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const key = `anbean:teslim-kutlama:${token}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // gizli sekme: sessionStorage yoksa yine de bir kez oynat
    }
    // setState efekt gövdesinde değil zamanlayıcı geri çağırmasında:
    // kaskad render yok, sunucu/istemci ilk karesi aynı kalır.
    const start = window.setTimeout(() => setPlay(true), 0);
    const stop = window.setTimeout(() => setPlay(false), 1400);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [reduce, token]);

  if (!play) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2;
        const distance = 70 + (i % 3) * 28;
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 h-2 w-3 rounded-[2px]"
            style={{ backgroundColor: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              rotate: 160,
              scale: 0.6,
            }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

/**
 * Kaydırınca beliren içerik (akış hissi). Yalnızca ekranın altındaki
 * bölümlerde kullanılır; hero'yu (LCP) asla geciktirmez. JS çalışmazsa
 * layout'taki <noscript> stili görünür kılar; "hareketi azalt" tercihinde
 * MotionConfig kaydırma dönüşümünü kapatır.
 */
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

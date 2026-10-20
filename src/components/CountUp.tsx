"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";

/**
 * Sayarak yükselen sayaç — AMA yalnızca gerçek sayılarla.
 * Sunucudan gelen değeri canlandırır; uydurma pazarlama sayısı üretmez.
 * "Hareketi azalt" tercihinde doğrudan son değeri basar.
 */
export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [animated, setAnimated] = useState(0);

  // "Hareketi azalt" tercihinde sayaç hiç çalışmaz, son değer doğrudan basılır.
  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(0, value, {
      duration: Math.min(1.4, 0.5 + Math.abs(value) / 400),
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setAnimated(latest),
    });
    return () => controls.stop();
  }, [inView, value, reduce]);

  const display = !inView ? 0 : reduce ? value : animated;

  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(display);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

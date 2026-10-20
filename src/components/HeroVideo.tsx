"use client";

import { useEffect, useState } from "react";

type NetworkInfo = { saveData?: boolean; effectiveType?: string };

/**
 * Hero arka planı.
 * - Poster her zaman çizilir: LCP'yi video değil bu ~30 KB görsel taşır.
 * - Video (720p, ~2 MB) yalnızca geniş ekranda, "hareketi azalt" kapalıyken,
 *   veri tasarrufu açık değilken ve tarayıcı boşa çıktıktan sonra yüklenir.
 * - Video hata verirse sessizce posterde kalınır.
 */
export default function HeroVideo({
  src,
  poster,
  posterSrcSet,
}: {
  src: string;
  poster: string;
  posterSrcSet: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const net = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    const constrained = Boolean(net?.saveData) || /(^|-)(2g|3g)$/.test(net?.effectiveType ?? "");
    if (reduce || !wide || constrained) return;

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setEnabled(true));
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setEnabled(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={poster}
        srcSet={posterSrcSet}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="h-full w-full object-cover opacity-45"
      />
      {enabled ? (
        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
          onError={() => setEnabled(false)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            ready ? "opacity-45" : "opacity-0"
          }`}
        />
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(11,18,32,0.96) 0%, rgba(11,18,32,0.8) 48%, rgba(11,18,32,0.5) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(0deg, #0b1220, transparent)" }}
      />
    </div>
  );
}

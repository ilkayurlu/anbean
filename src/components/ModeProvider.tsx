"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";

export type Mode = "gonder" | "sur";

/** Rota hangi ürüne aitse aksan o moda geçer: renk, kullanıcıya nerede olduğunu söyler. */
export function modeForPath(pathname: string): Mode {
  return pathname.startsWith("/filo-haritasi") ? "sur" : "gonder";
}

/** Operasyon panellerinde alt gezinme gösterilmez. */
export function isNavHidden(pathname: string): boolean {
  return ["/ops", "/admin", "/courier"].some((prefix) => pathname.startsWith(prefix));
}

type ModeContextValue = { mode: Mode; setMode: (mode: Mode) => void };

const ModeContext = createContext<ModeContextValue>({ mode: "gonder", setMode: () => {} });

export function useMode() {
  return useContext(ModeContext);
}

/**
 * data-mode özniteliğini taşıyan kök. Sunucuda da rotadan hesaplandığı için
 * ilk HTML doğru renkle gelir (yanıp sönme yok). Hero'daki seçim yalnızca o
 * sayfada geçerli; rota değişince rotanın modu geri gelir.
 * MotionConfig: "hareketi azalt" tercihinde Motion dönüşümleri kapatır.
 */
export default function ModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const [override, setOverride] = useState<{ path: string; mode: Mode } | null>(null);
  const mode = override && override.path === pathname ? override.mode : modeForPath(pathname);
  const setMode = useCallback((next: Mode) => setOverride({ path: pathname, mode: next }), [pathname]);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  const navHidden = isNavHidden(pathname);

  return (
    <MotionConfig reducedMotion="user">
      <ModeContext.Provider value={value}>
        <div
          data-mode={mode}
          className={`min-h-screen ${navHidden ? "" : "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"}`}
        >
          {children}
        </div>
      </ModeContext.Provider>
    </MotionConfig>
  );
}

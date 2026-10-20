import type { ReactNode } from "react";

/**
 * Rota geçişi yalnızca CSS ile yapılıyor (.page-enter). Opaklık 0.4'ten
 * başladığı için LCP öğesi ilk karede görünür ve JS beklenmez. "Hareketi
 * azalt" tercihinde globals.css animasyonu anlık yapar.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type ConsentRow = { category: string; granted: boolean; policyVersion: string };

const LABELS: Record<string, { title: string; body: string; locked?: boolean }> = {
  aydinlatma: {
    title: "KVKK aydınlatma metni",
    body: "Hizmetin ifası için zorunlu veri işleme. Bu bir pazarlama izni değildir ve hizmet kullanımının koşulu olarak ayrı tutulur.",
    locked: true,
  },
  ticari_iletisim: {
    title: "Ticari elektronik ileti",
    body: "Kampanya ve duyuru iletileri. Tamamen opsiyonel; kapatmak hizmeti etkilemez.",
  },
  bildirim: {
    title: "İşlem bildirimleri",
    body: "Sipariş, sürüş ve gönderi durumu bildirimleri. İşlem güvenliği için önerilir.",
  },
  konum: {
    title: "Konum verisi",
    body: "Yalnızca hizmet sırasında kullanılır. Kurye konumu sadece aktif görevde toplanır; sürekli arka plan izlemesi yapılmaz.",
  },
  cerez_analitik: {
    title: "Analitik çerezler",
    body: "Şu an hiçbir analitik veya pazarlama çerezi ÇALIŞMIYOR; sağlayıcı seçilmedi. Bu tercih, ileride devreye alınırsa geçerli olur.",
  },
};

/** İzin merkezi: verme ve geri çekme aynı görünürlükte. */
export default function ConsentToggles({ initial }: { initial: ConsentRow[] }) {
  const router = useRouter();
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(initial.map((row) => [row.category, row.granted])),
  );
  const [busy, setBusy] = useState("");

  async function toggle(category: string, granted: boolean) {
    setBusy(category);
    await fetch("/api/consents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, granted }),
    });
    setState((prev) => ({ ...prev, [category]: granted }));
    setBusy("");
    router.refresh();
  }

  return (
    <ul className="divide-y divide-slate-100">
      {Object.entries(LABELS).map(([category, meta]) => {
        const granted = state[category] ?? false;
        const version = initial.find((row) => row.category === category)?.policyVersion ?? "0.1";
        return (
          <li key={category} className="flex flex-wrap items-start justify-between gap-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800">{meta.title}</p>
              <p className="mt-1 text-xs text-slate-500">{meta.body}</p>
              <p className="mt-1 text-[11px] text-slate-400">Politika sürümü: v{version} (taslak)</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={granted}
              aria-label={meta.title}
              disabled={meta.locked || busy === category}
              onClick={() => toggle(category, !granted)}
              className={`relative h-7 w-14 shrink-0 rounded-full transition disabled:opacity-40 ${
                granted ? "bg-accent" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  granted ? "left-8" : "left-1"
                }`}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

import PageShell from "@/components/PageShell";
import CourierApplyForm from "@/components/CourierApplyForm";
import StatusStrip, { StatusPill } from "@/components/StatusStrip";
import { getMediaSlots, slotOrFallback } from "@/lib/media";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kurye Başvurusu — Anbean" };

export default async function KuryeBasvurPage() {
  const slots = await getMediaSlots();
  const media = slotOrFallback(slots, "courier.apply");

  return (
    <PageShell
      eyebrow="Sözleşmeli · esnek vardiya"
      title="Kurye ekranını başvurmadan önce gör"
      lead="Tek elle kullanılabilen, yüksek kontrastlı görev ekranı. Büyük dokunma hedefleri, sade iki aksiyon."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <CourierApplyForm />
          <div className="mt-6 overflow-hidden rounded-lg border border-white/10">
            {media.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt="Kurye" className="h-60 w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-60 w-full" style={{ background: media.fallbackCss }} />
            )}
            <p className="bg-[#0a101c] px-4 py-2 text-[11px] text-slate-500">
              Görsel: {media.credit} · Fotoğraftaki kişiler Anbean personeli değildir.
            </p>
          </div>
        </div>

        {/* Kurye gözünden önizleme */}
        <aside className="rounded-lg border border-white/12 bg-[#0a101c] p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Kurye ekranı önizleme</p>
          <div className="mt-4 rounded-md border border-white/10 bg-white/4 p-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-white">AB-2026-001002</span>
              <StatusPill status="dagitima_cikti" dark />
            </div>
            <StatusStrip status="dagitima_cikti" size="md" className="mt-4" />
            <p className="mt-4 text-sm text-slate-300">Beşiktaş → Üsküdar</p>
            <p className="text-xs text-slate-500">1,8 kg · Ekspres · 11,4 km</p>
            <div className="mt-4 grid gap-2">
              <span className="flex h-14 items-center justify-center rounded-md bg-st-delivered text-base font-semibold text-white">
                Teslim ettim
              </span>
              <span className="flex h-14 items-center justify-center rounded-md border border-st-risk/50 text-base font-semibold text-st-risk">
                Teslim edemedim
              </span>
            </div>
          </div>
          <ul className="mt-5 space-y-2 text-xs text-slate-400">
            <li>· 56px+ dokunma hedefleri</li>
            <li>· Yalnızca sana atanan gönderiler görünür</li>
            <li>· Konum yalnızca aktif görevde gönderilir</li>
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}

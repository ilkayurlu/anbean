import Link from "next/link";
import PageShell from "@/components/PageShell";
import { MODULES } from "@/lib/brand";
import { GUARANTEE } from "@/lib/guarantee";
import StatusStrip from "@/components/StatusStrip";

export const metadata = {
  title: "Nasıl çalışır? — Anbean",
  description: "Yemek, yolculuk ve gönderi için süreç, ücretlendirme, takip, destek ile iptal ve iade özeti.",
};

const FLOWS: Record<
  string,
  { steps: { t: string; d: string }[]; fee: string; tracking: string; support: string; cancel: string; status: string }
> = {
  yemek: {
    steps: [
      { t: "Keşfet", d: "Pilot katalogdan işletme ve menü seç; alerjen bilgisini gör." },
      { t: "Sepete ekle", d: "Sepet tek işletmeye bağlıdır; işletmeler arası birleştirme yapılmaz." },
      { t: "Ücreti gör", d: "Ürün, indirim, teslimat, hizmet ve küçük sepet bedeli ayrı satırlarda." },
      { t: "Onayla ve öde", d: "Tutar sunucuda yeniden hesaplanır; sürpriz ücret çıkmaz." },
      { t: "Takip et", d: "Sipariş, kurye gönderisiyle aynı durum şeridini kullanır." },
    ],
    fee: "Ürün toplamı − indirim + teslimat + hizmet bedeli + varsa küçük sepet bedeli + opsiyonel bahşiş. KDV dahil.",
    tracking: "Durum Renk Şeridi + olay geçmişi + tahmini süre. Adres ve telefon takip sayfasında gösterilmez.",
    support: "İşlem merkezli destek: talebi siparişe bağlayabilirsin, görüşme denetlenir.",
    cancel: "Hazırlık başlamadan önce iptal; hatalı/eksik ürün bildirimi iade doğurur. Ayrıntı: iptal ve iade politikası (taslak).",
    status: "dagitima_cikti",
  },
  yolculuk: {
    steps: [
      { t: "Haritayı aç", d: "Müsait elektrikli araçları batarya ve menzille birlikte gör." },
      { t: "Aracı seç", d: "Bataryası %20'nin altındaki araçlar kiralanamaz." },
      { t: "Kilidi aç", d: "İstek sunucuda doğrulanır; kilit yetkisi tarayıcıya bırakılmaz." },
      { t: "Sür", d: "Süre ve tahmini ücret canlı gösterilir." },
      { t: "Bitir ve kilitle", d: "Kesin tutar sunucuda hesaplanır, bakiyeden düşer." },
    ],
    fee: "Dakika × tarife. Yoğun bölge çarpanı uygulanırsa sipariş öncesi gösterilir.",
    tracking: "Aktif sürüş paneli: süre, tahmini ücret ve kilit durumu.",
    support: "Araç kaynaklı sorunlarda destek talebi sürüşe bağlanır.",
    cancel: "Sürüş başladıktan sonra iptal edilmez; süre kadar ücret tahsil edilir.",
    status: "gonderi_alindi",
  },
  gonder: {
    steps: [
      { t: "Adresleri gir", d: "Alım ve teslim adresi, paket türü, ağırlık ve mesafe." },
      { t: "Ücreti gör", d: "Taban + mesafe + ağırlık + bölge farkı ayrı satırlarda." },
      { t: "Kurye atanır", d: "Atama sunucuda; kurye yalnızca kendi görevini görür." },
      { t: "Teslim edilir", d: "Kanıt kaydı alınır, durum şeridi tamamlanır." },
    ],
    fee: "Tarife tabanı + km + kg + bölge farkı. Kurumsal hesaplar faturayla öder.",
    tracking: "Yüksek entropili takip kodu, hız sınırlı public sayfa, ilçe seviyesi konum.",
    support: `İstisnalarda ${GUARANTEE.resolutionSlaMinutes} dakikalık çözüm taahhüdü.`,
    cancel: "Alım öncesi iptal edilebilir. Başarısız teslimatta yeniden planlama veya iade.",
    status: "teslim_edildi",
  },
};

export default function NasilCalisirPage() {
  return (
    <PageShell
      eyebrow="Nasıl çalışır"
      title="Üç hizmet, aynı işleyiş mantığı"
      lead="Ücreti önceden gör, süreci canlı takip et, sorun olursa tek merkezden çözüm iste."
    >
      <div className="space-y-10">
        {MODULES.map((module) => {
          const flow = FLOWS[module.key];
          if (!flow) return null;
          return (
            <section key={module.key} className="rounded-lg border border-white/10 bg-white/3 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-bold text-white">{module.label}</h2>
                <span className="rounded-full border border-white/12 px-3 py-1 text-[11px] font-semibold text-slate-300">
                  {module.status === "hazir" ? "Kullanıma açık" : module.status === "pilot" ? "Pilot bölgede" : "Şu an sunulmuyor"}
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">{module.summary}</p>

              <ol className="mt-6 grid gap-3 md:grid-cols-5">
                {flow.steps.map((step, index) => (
                  <li key={step.t} className="rounded-md border border-white/8 bg-white/3 p-4">
                    <span className="font-display text-lg font-bold text-accent">{index + 1}</span>
                    <p className="mt-1 text-sm font-semibold text-white">{step.t}</p>
                    <p className="mt-1 text-xs text-slate-400">{step.d}</p>
                  </li>
                ))}
              </ol>

              <StatusStrip status={flow.status} size="md" className="mt-6" />

              <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
                {[
                  { label: "Ücretlendirme", value: flow.fee },
                  { label: "Takip", value: flow.tracking },
                  { label: "Destek", value: flow.support },
                  { label: "İptal ve iade", value: flow.cancel },
                ].map((row) => (
                  <div key={row.label}>
                    <dt className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{row.label}</dt>
                    <dd className="mt-1 text-slate-300">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <Link href={module.href} className="mt-5 inline-block text-sm font-semibold text-accent">
                {module.intent} →
              </Link>
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}

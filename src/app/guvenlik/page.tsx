import Link from "next/link";
import PageShell from "@/components/PageShell";
import Reveal from "@/components/Reveal";
import { BRAND } from "@/lib/brand";
import { GUARANTEE } from "@/lib/guarantee";

export const metadata = {
  title: "Güvenlik — Anbean",
  description:
    "Yolcu, kurye, teslimat, ödeme, konum ve hesap güvenliği. Uygulanmış kontroller ve henüz uygulanmayanlar açıkça ayrılır.",
};

const SECTIONS = [
  {
    title: "Teslimat güvenliği",
    implemented: true,
    items: [
      "Durum makinesi sunucuda zorlanır; geçersiz geçiş reddedilir.",
      "Teslimat kanıtı kaydı tutulur (imza/fotoğraf/OTP alanları şemada mevcut).",
      "Başarısız teslimatta istisna kuyruğu ve çözüm taahhüdü işler.",
    ],
    gap: "Kamera ile OTP doğrulama akışı henüz bağlı değil; özel dosya depolaması seçilmedi.",
  },
  {
    title: "Konum paylaşımı",
    implemented: true,
    items: [
      "Kurye konumu YALNIZCA aktif görev sırasında kabul edilir.",
      "Görevi olmayan kuryenin konum isteği reddedilir ve denetime yazılır.",
      "Takip sayfası konumu ilçe seviyesinde gösterir, kesin adres vermez.",
    ],
    gap: "Araç telemetrisi simüle veridir; gerçek cihaz akışı (MQTT/BLE) bağlı değil.",
  },
  {
    title: "Ödeme güvenliği",
    implemented: true,
    items: [
      "Kart bilgisi uygulama sunucusunda saklanmaz ve işlenmez.",
      "Tüm tutarlar sunucuda hesaplanır; tarayıcıdan gelen tutar yok sayılır.",
      "Para hareketleri çift taraflı kayıtla yazılır; veritabanı silme/değiştirmeyi reddeder.",
    ],
    gap: "Gerçek ödeme kuruluşu bağlı değil. Platform bakiyesi demo amaçlıdır ve elektronik para değildir.",
  },
  {
    title: "Hesap güvenliği",
    implemented: true,
    items: [
      "Şifreler scrypt ile hash'lenir; ham şifre saklanmaz ve loglanmaz.",
      "Oturum çerezi httpOnly ve HMAC imzalıdır.",
      "Rol yükseltme ve yetkisiz erişim denemeleri denetim kaydına yazılır.",
      "Giriş, kayıt ve sıfırlama uçları hız sınırına tabidir.",
    ],
    gap: "İki adımlı doğrulama ve e-posta doğrulaması henüz yok. Demo hesaplar geçici erişim kodu kullanıyor.",
  },
  {
    title: "Kurye ve sürücü doğrulaması",
    implemented: false,
    items: [
      "Belge yükleme alanları şemada tanımlı (kimlik, ehliyet, adli sicil, araç ruhsatı).",
      "Başvuru formu çalışıyor ve kaydediliyor.",
    ],
    gap: "Belge inceleme ve onay akışı özel depolama olmadan çalışmıyor; şu an yalnızca başvuru toplanıyor.",
  },
  {
    title: "Gizlilik ve takip",
    implemented: true,
    items: [
      "Takip bağlantısı herkese açıktır: adres, telefon ve alıcının tam adı gösterilmez.",
      "Bildirim kayıtlarında telefon maskelenir (PII loglanmaz).",
      "Takip kodları yüksek entropilidir ve hız sınırına tabidir.",
    ],
    gap: "Teslimat fotoğrafı için zamana bağlı imzalı URL üretimi depolama sağlayıcısı seçilince eklenecek.",
  },
  {
    title: "Acil durum ve sorun bildirimi",
    implemented: true,
    items: [
      "İşlem merkezli destek: talep gönderi veya sürüşe bağlanabilir.",
      "Destek ekibi talep durumunu yönetir; görüşmeler denetlenir.",
      `İstisna çözüm taahhüdü: ${GUARANTEE.resolutionSlaMinutes} dakika.`,
    ],
    gap: "Canlı sohbet ve acil durum (SOS) butonu henüz yok.",
  },
];

export default function GuvenlikPage() {
  return (
    <PageShell
      eyebrow="Güvenlik"
      title="Ne uygulandı, ne henüz uygulanmadı"
      lead="Bu sayfa pazarlama metni değil; çalışan kontroller ile eksikleri aynı netlikte gösterir."
    >
      <div className="space-y-5">
        {SECTIONS.map((section, index) => (
          <Reveal key={section.title} delay={index * 0.03}>
            <article className="rounded-lg border border-white/10 bg-white/3 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-white">{section.title}</h2>
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{
                    color: section.implemented ? "#86EFAC" : "#FCD34D",
                    backgroundColor: section.implemented ? "rgba(22,163,74,0.16)" : "rgba(245,158,11,0.16)",
                  }}
                >
                  {section.implemented ? "Uygulandı" : "Kısmen / planlandı"}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-md border border-white/8 bg-white/3 p-3 text-xs text-slate-400">
                <strong className="text-slate-300">Bilinen sınır:</strong> {section.gap}
              </p>
            </article>
          </Reveal>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-white/10 bg-white/3 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Bir sorun mu fark ettin?</h2>
        <p className="mt-2 text-sm text-slate-400">
          Güvenlik açığı bildirimleri için: {BRAND.support.privacyEmail} · Destek: {BRAND.support.email}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/app/destek" className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-[#0B1220]">
            Destek talebi aç
          </Link>
          <Link href="/yasal/konum-verisi-aydinlatma" className="rounded-md border border-white/15 px-5 py-2.5 text-sm text-slate-200">
            Konum verisi aydınlatması
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

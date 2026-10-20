/**
 * MARKA TEK KAYNAĞI
 *
 * Marka adı 1. aşamada kesinleşti: Anbean. Bu yüzden `[MARKA ADI]` gibi bir
 * yer tutucu KULLANMIYORUZ — yer tutucu production'a sızma riski taşır.
 * İsim değişirse yalnızca bu dosya güncellenir.
 *
 * Yayın öncesi `scripts/pre-release-check.sh` bu sabitlerin dışında kalan
 * marka adı kalıntılarını ve yer tutucuları tarar.
 */
export const BRAND = {
  name: "Anbean",
  legalName: "Anbean Lojistik Teknolojileri A.Ş.",
  /** Ana marka fikri — hukuki/operasyonel vaat değildir. */
  idea: "Şehirde neye ihtiyacın varsa, tek hareketle.",
  supportingLine:
    "Acıktığında, yola çıktığında veya bir şey göndermen gerektiğinde ayrı uygulamalar arasında kaybolma. Tek hesabınla ihtiyacını seç, ücretini önceden gör ve süreci canlı takip et.",
  /** Operasyonel vaat: hız değil görünürlük. Doğrulanabilir tek iddia budur. */
  promise: "gönderin an be an",
  domain: "anbean.com.tr",
  support: {
    phone: "0850 000 00 00",
    phoneHours: "Her gün 08:00 – 22:00",
    email: "destek@anbean.com.tr",
    corporateEmail: "kurumsal@anbean.com.tr",
    privacyEmail: "kvkk@anbean.com.tr",
    address: "Caferağa Mah. Moda Cad. No:12 K:3 · Kadıköy / İstanbul",
  },
} as const;

/** Hizmet modülleri ve GERÇEK durumları. Yanlış "hazır" etiketi yok. */
export type ModuleStatus = "hazir" | "pilot" | "sunulmuyor";

export type ServiceModule = {
  key: "yemek" | "yolculuk" | "gonder";
  label: string;
  status: ModuleStatus;
  href: string;
  /** Kullanıcının niyeti, marka tonunda (emir değil, yönlendirme). */
  intent: string;
  summary: string;
};

export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
  hazir: "Kullanıma açık",
  pilot: "Pilot bölgede",
  sunulmuyor: "Şu an sunulmuyor",
};

export const MODULES: ServiceModule[] = [
  {
    key: "yemek",
    label: "Yemek",
    status: "pilot",
    href: "/yemek",
    intent: "Bugün ne yemek istersin?",
    summary:
      "Pilot katalog: demo işletmeler, gerçek menü yapısı ve şeffaf ücret dökümü. İşletme ağı genişledikçe katalog gerçek ortaklarla güncellenir.",
  },
  {
    key: "yolculuk",
    label: "Yolculuk",
    status: "hazir",
    href: "/yolculuk",
    intent: "Nereye gidiyorsun?",
    summary:
      "Elektrikli scooter, e-bisiklet ve moped kiralama. Sürücülü yolculuk (araç/motosiklet çağırma) şu an sunulmuyor.",
  },
  {
    key: "gonder",
    label: "Gönder",
    status: "hazir",
    href: "/gonder",
    intent: "Paketini güvenle gönder.",
    summary:
      "Şehir içi kurye ve aynı gün teslim. Fiyat sunucuda hesaplanır, süreç Durum Renk Şeridi ile takip edilir.",
  },
];

/** CTA sözlüğü — aynı eylem her ekranda aynı kelimelerle çağrılır. */
export const CTA = {
  start: "Hemen başla",
  login: "Giriş yap",
  register: "Hesap oluştur",
  track: "Takip et",
  findShipment: "Gönderimi bul",
  getQuote: "Ücreti gör",
  createShipment: "Gönderi oluştur",
  findVehicle: "Araç bul",
  viewCart: "Sepeti gör",
  placeOrder: "Siparişi onayla ve öde",
  corporate: "Kurumsal çözümler",
  help: "Yardım",
  applyCourier: "Kurye/sürücü başvurusu",
  partnerRestaurant: "Restoran başvurusu",
  consentCenter: "İzin merkezini aç",
  downloadApp: "Mobil uygulama",
} as const;

/**
 * İndirme rozetleri: uygulama mağazalarında yayınlanmış bir uygulama YOK.
 * Bu yüzden rozet değil, doğru durum etiketi gösterilir.
 */
export const APP_STATUS = {
  ios: "yakında",
  android: "yakında",
  pwa: "hazır",
  note: "Web uygulaması mobil tarayıcıda çalışır ve ana ekrana eklenebilir. Yerel uygulamalar yayınlandığında burada duyurulur.",
} as const;

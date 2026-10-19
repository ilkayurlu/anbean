/**
 * POLİTİKA KAYIT DEFTERİ
 *
 * Hukuki metin UYDURULMAZ. Her belge:
 *  - "taslak" durumundadır ve yayınlanmış sözleşme gibi sunulmaz,
 *  - kapsamını madde madde açıklar (neyi düzenleyeceği),
 *  - sürüm, yürürlük/güncelleme tarihi, belge sahibi ve iletişim kanalı taşır,
 *  - iş modeline göre sınıflandırılır.
 *
 * Gerçek metinler hukuk danışmanı onayından sonra bu dosyaya (veya CMS'e)
 * işlenir; onay gelene kadar arayüz taslak uyarısını göstermeye devam eder.
 */

export type PolicyClassification =
  | "zorunlu-olabilir"
  | "modele-bagli"
  | "simdilik-gereksiz"
  | "hukukcu-karari";

export type PolicyStatus = "taslak" | "hukuk-incelemesinde" | "yayinda";

export type Policy = {
  slug: string;
  /** Eski bağlantılar için eş adlar (footer ve önceki sürüm rotaları). */
  aliases?: string[];
  title: string;
  group: "gizlilik" | "sozlesme" | "operasyon" | "izin";
  classification: PolicyClassification;
  status: PolicyStatus;
  version: string;
  owner: string;
  effectiveDate: string;
  lastUpdated: string;
  changeSummary: string;
  summary: string;
  covers: string[];
  contact: string;
};

export const CLASSIFICATION_LABEL: Record<PolicyClassification, string> = {
  "zorunlu-olabilir": "Zorunlu olabilir",
  "modele-bagli": "Operasyon modeline bağlı",
  "simdilik-gereksiz": "Şimdilik gereksiz",
  "hukukcu-karari": "Hukukçu kararı gerekli",
};

const OWNER_PRIVACY = "Veri Sorumlusu Temsilcisi";
const OWNER_LEGAL = "Hukuk (dış danışman)";
const OWNER_OPS = "Operasyon";
const CONTACT_PRIVACY = "kvkk@anbean.com.tr";
const CONTACT_SUPPORT = "destek@anbean.com.tr";
const CONTACT_LEGAL = "hukuk@anbean.com.tr";

export const POLICIES: Policy[] = [
  {
    slug: "gizlilik-politikasi",
    title: "Gizlilik Politikası",
    group: "gizlilik",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_PRIVACY,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "İlk taslak kapsamı çıkarıldı.",
    summary:
      "Platformda hangi verilerin, hangi amaçla ve ne kadar süreyle işlendiğini kullanıcı diliyle özetler.",
    covers: [
      "İşlenen veri kategorileri: kimlik, iletişim, adres, işlem ve konum verisi",
      "İşleme amaçları ve hukuki sebepler",
      "Saklama süreleri ve silme/anonimleştirme",
      "Veri aktarılan taraflar (kurye, işletme, hizmet sağlayıcı)",
      "Kullanıcı hakları ve başvuru yolu",
      "Çocuklara ilişkin yaklaşım",
    ],
    contact: CONTACT_PRIVACY,
  },
  {
    slug: "kvkk-aydinlatma",
    aliases: ["kvkk"],
    title: "KVKK Aydınlatma Metni",
    group: "gizlilik",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_PRIVACY,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Mevcut kısa metin, aydınlatma ve rıza ayrımı netleştirilerek genişletildi.",
    summary:
      "6698 sayılı Kanun kapsamındaki aydınlatma yükümlülüğünü karşılar. AYDINLATMA ile AÇIK RIZA ayrı belgelerdir.",
    covers: [
      "Veri sorumlusunun kimliği",
      "İşlenen kişisel veri kategorileri",
      "İşleme amaçları ve hukuki sebepler (KVKK m.5/2, m.6)",
      "Aktarım yapılan taraflar ve aktarım amacı",
      "Veri toplama yöntemi",
      "KVKK m.11 hakları ve başvuru usulü",
    ],
    contact: CONTACT_PRIVACY,
  },
  {
    slug: "cerez-politikasi",
    aliases: ["cerez"],
    title: "Çerez Politikası",
    group: "izin",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_PRIVACY,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Çerez kategorileri ve mevcut gerçek kullanım durumu yazıldı.",
    summary:
      "Kullanılan çerezleri kategori bazında açıklar. Şu an yalnızca zorunlu oturum çerezi kullanılıyor; analitik veya pazarlama çerezi ÇALIŞMIYOR.",
    covers: [
      "Zorunlu çerezler: oturum (anbean_session, httpOnly)",
      "İşlevsel çerezler: şu an kullanılmıyor",
      "Analitik çerezler: şu an kullanılmıyor, sağlayıcı seçilmedi",
      "Pazarlama çerezleri: kullanılmıyor",
      "Tarayıcı üzerinden çerez yönetimi",
      "Politika değişikliklerinde bilgilendirme",
    ],
    contact: CONTACT_PRIVACY,
  },
  {
    slug: "cerez-tercihleri",
    title: "Çerez Tercih Merkezi",
    group: "izin",
    classification: "modele-bagli",
    status: "taslak",
    version: "0.1",
    owner: OWNER_PRIVACY,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge. Analitik sağlayıcı seçilene kadar tercih merkezi sınırlı.",
    summary:
      "Gerekli olmayan çerez kategorileri için kabul/red tercihlerinin yönetildiği ekran. Reddet, kabul kadar görünür olacak.",
    covers: [
      "Kategori bazlı tercih (gerekli / işlevsel / analitik / pazarlama)",
      "Tümünü reddet ile tümünü kabul et eşit görünürlükte",
      "Tercih kaydının sürüm ve zaman damgasıyla saklanması",
      "Tercihin geri çekilmesi",
    ],
    contact: CONTACT_PRIVACY,
  },
  {
    slug: "kullanim-kosullari",
    aliases: ["kullanim"],
    title: "Kullanım Koşulları",
    group: "sozlesme",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_LEGAL,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Üç hizmet modülünü kapsayacak şekilde genişletildi.",
    summary: "Platformun kullanımına ilişkin genel çerçeve. Yemek, yolculuk ve gönderi modüllerini kapsar.",
    covers: [
      "Hizmetin kapsamı ve sınırları",
      "Kullanıcı yükümlülükleri ve yasaklı kullanımlar",
      "Hesap güvenliği ve tek hesap kuralı",
      "Fikri mülkiyet",
      "Hizmet değişikliği ve sonlandırma",
      "Sorumluluk sınırları",
      "Uygulanacak hukuk ve uyuşmazlık çözümü",
    ],
    contact: CONTACT_LEGAL,
  },
  {
    slug: "uyelik-sozlesmesi",
    title: "Üyelik Sözleşmesi",
    group: "sozlesme",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_LEGAL,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge.",
    summary: "Kayıt sırasında kurulan üyelik ilişkisinin koşulları.",
    covers: [
      "Taraflar ve sözleşmenin kurulma anı",
      "Üyelik şartları ve yaş sınırı",
      "Doğru bilgi verme yükümlülüğü",
      "Hesabın askıya alınması ve kapatılması",
      "Ticari elektronik ileti ile ilişkisi",
    ],
    contact: CONTACT_LEGAL,
  },
  {
    slug: "mesafeli-satis-on-bilgilendirme",
    title: "Mesafeli Satış Ön Bilgilendirme Formu",
    group: "sozlesme",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_LEGAL,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge — yemek siparişi mesafeli satış kapsamında değerlendirilmeli.",
    summary:
      "Yemek siparişi ve gönderi hizmetinde sipariş onayından ÖNCE gösterilmesi gereken ön bilgilendirme.",
    covers: [
      "Satıcı/sağlayıcı bilgileri",
      "Hizmetin temel nitelikleri",
      "Toplam bedel ve tüm ek ücretler (teslimat, hizmet, küçük sepet bedeli)",
      "Ödeme ve teslimat bilgileri",
      "Cayma hakkı ve istisnaları",
      "Şikayet ve itiraz mercileri",
    ],
    contact: CONTACT_LEGAL,
  },
  {
    slug: "mesafeli-satis-sozlesmesi",
    title: "Mesafeli Satış Sözleşmesi",
    group: "sozlesme",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_LEGAL,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge.",
    summary: "Ön bilgilendirme onayından sonra kurulan sözleşme.",
    covers: [
      "Sözleşmenin konusu ve kapsamı",
      "Sipariş ve onay akışı",
      "Teslimat koşulları",
      "Bedel ve ödeme",
      "Cayma hakkı kullanımı",
      "Kayıtların saklanması",
    ],
    contact: CONTACT_LEGAL,
  },
  {
    slug: "iptal-iade",
    title: "İptal, İade ve Cayma Politikası",
    group: "operasyon",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_LEGAL,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge. Teslimat Güvencesi mekanizmasıyla ilişkisi açıklanmalı.",
    summary:
      "Hangi durumlarda iptal ve iade yapılabileceği. Hazır gıda gibi cayma istisnaları ayrıca düzenlenmeli.",
    covers: [
      "Sipariş hazırlanmadan önce iptal",
      "Hatalı/eksik ürün bildirimi ve süresi",
      "Başarısız teslimat ve iade süreci",
      "Teslimat Güvencesi otomatik iadeleri (20 dk %25 / 1 saat %50 / 2 saat %100)",
      "İade tutarının platform bakiyesine yazılması",
      "Cayma hakkının istisnaları",
    ],
    contact: CONTACT_SUPPORT,
  },
  {
    slug: "teslimat-kosullari",
    title: "Teslimat Koşulları",
    group: "operasyon",
    classification: "modele-bagli",
    status: "taslak",
    version: "0.1",
    owner: OWNER_OPS,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge.",
    summary: "Teslimat bölgeleri, süre tahminleri, teslim alma ve başarısız teslimat davranışı.",
    covers: [
      "Hizmet bölgeleri ve kapsam dışı adresler",
      "Tahmini sürelerin bağlayıcı olmadığı",
      "Teslimatta alıcı doğrulaması (OTP/imza)",
      "Kapıda bulunamama ve yeniden deneme",
      "İade süreci",
    ],
    contact: CONTACT_SUPPORT,
  },
  {
    slug: "yasakli-gonderiler",
    title: "Yasaklı ve Kısıtlı Gönderiler",
    group: "operasyon",
    classification: "modele-bagli",
    status: "taslak",
    version: "0.1",
    owner: OWNER_OPS,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge.",
    summary: "Taşınması kabul edilmeyen gönderi türleri ve tespit halinde uygulanacak işlem.",
    covers: [
      "Yanıcı, patlayıcı ve tehlikeli maddeler",
      "Yasa dışı içerik ve mevzuata aykırı ürünler",
      "Bozulabilir gıda koşulları",
      "Değerli evrak ve nakit sınırları",
      "Tespit halinde bloke/iptal ve sorumluluk",
    ],
    contact: CONTACT_SUPPORT,
  },
  {
    slug: "yolculuk-kurallari",
    title: "Yolculuk Kuralları",
    group: "operasyon",
    classification: "hukukcu-karari",
    status: "taslak",
    version: "0.1",
    owner: OWNER_OPS,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary:
      "Kapsam daraltıldı: sürücülü yolculuk hizmeti verilmediği için bu belge yalnızca mikro-mobiliteyi kapsar.",
    summary:
      "Yolculuk davranış kuralları. DİKKAT: platform sürücülü yolculuk (araç/motosiklet çağırma) hizmeti VERMİYOR; bu belge o kapsamı düzenlemez.",
    covers: [
      "Kasko/sigorta ve sorumluluk sınırları",
      "Yolcu davranış kuralları",
      "Acil durum ve güvenlik bildirimleri",
      "Sürücülü yolculuk hizmetinin kapsam dışı olduğunun açık beyanı",
    ],
    contact: CONTACT_SUPPORT,
  },
  {
    slug: "mobilite-kiralama-kosullari",
    title: "Mikro-Mobilite Kiralama Koşulları",
    group: "operasyon",
    classification: "modele-bagli",
    status: "taslak",
    version: "0.1",
    owner: OWNER_LEGAL,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge — elektrikli filo kiralama gerçek bir hizmet.",
    summary: "Scooter, e-bisiklet ve moped kiralamanın koşulları.",
    covers: [
      "Yaş ve ehliyet gereklilikleri",
      "Kullanım alanı, hız limiti ve park kuralları",
      "Kiralama ücretinin dakika bazlı hesaplanması",
      "Hasar, kayıp ve kötüye kullanım sorumluluğu",
      "Kask ve trafik güvenliği",
      "Batarya ve menzil sınırları",
    ],
    contact: CONTACT_LEGAL,
  },
  {
    slug: "konum-verisi-aydinlatma",
    title: "Konum Verisi Aydınlatma Metni",
    group: "gizlilik",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_PRIVACY,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge — konum işleme gerçek: kurye ve araç telemetrisi.",
    summary:
      "Konum verisinin ne zaman, kimden ve ne amaçla toplandığını açıklar. Sürekli arka plan izlemesi YAPILMAZ.",
    covers: [
      "Kurye konumu: yalnızca aktif görev süresince",
      "Görevi olmayan kuryenin konum isteğinin reddedilmesi",
      "Araç telemetrisi: kiralama süresi boyunca",
      "Kullanıcı adresi: hizmetin ifası amacıyla",
      "Saklama süresi ve TTL",
      "Hassas konum (ev/iş) ayrımı ve maskeleme",
    ],
    contact: CONTACT_PRIVACY,
  },
  {
    slug: "kurye-surucu-aydinlatma",
    title: "Kurye ve Sürücü Adayı Aydınlatma Metni",
    group: "gizlilik",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_PRIVACY,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge — başvuru formu ve belge yükleme akışı veri işliyor.",
    summary: "Kurye/sürücü adaylarının ve çalışanlarının verilerinin işlenmesine ilişkin aydınlatma.",
    covers: [
      "Başvuru sırasında alınan veriler",
      "Kimlik, ehliyet, adli sicil ve araç belgeleri",
      "Belgelerin saklanma süresi ve erişim kontrolü",
      "Hakediş ve ödeme verileri",
      "Performans ve konum verileri",
      "Aday reddedildiğinde verinin silinmesi",
    ],
    contact: CONTACT_PRIVACY,
  },
  {
    slug: "ticari-iletisim",
    title: "Ticari Elektronik İleti İzni",
    group: "izin",
    classification: "zorunlu-olabilir",
    status: "taslak",
    version: "0.1",
    owner: OWNER_PRIVACY,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge — kayıtta pazarlama izni ayrı ve opsiyonel tutuluyor.",
    summary:
      "Ticari elektronik ileti izni. Hizmet için zorunlu veri işleme, pazarlama iznine BAĞLANMAZ; izin ayrı ve geri çekilebilir.",
    covers: [
      "İzin kapsamı (SMS, e-posta, uygulama bildirimi)",
      "İznin opsiyonel olması ve hizmete etkisinin bulunmaması",
      "İzin kaydının sürüm, zaman ve kaynakla saklanması",
      "İzni geri çekme yolları",
      "İYS (İleti Yönetim Sistemi) yükümlülüğü — hukukçu kararı",
    ],
    contact: CONTACT_PRIVACY,
  },
  {
    slug: "is-ortagi-kosullari",
    title: "İş Ortağı Koşulları",
    group: "sozlesme",
    classification: "hukukcu-karari",
    status: "taslak",
    version: "0.1",
    owner: OWNER_LEGAL,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary:
      "Yeni belge — henüz gerçek restoran/filo ortağı olmadığı için yayın öncesi hukukçu kararı gerekli.",
    summary: "Restoran, işletme, filo ve saha iş ortaklarıyla kurulacak ilişkinin çerçevesi.",
    covers: [
      "İş ortaklığı türleri ve kapsamı",
      "Komisyon ve ödeme koşulları",
      "Menü/içerik doğruluğu sorumluluğu",
      "Gıda güvenliği ve hijyen yükümlülükleri",
      "Marka kullanım sınırları",
      "Fesih ve askıya alma",
    ],
    contact: CONTACT_LEGAL,
  },
  {
    slug: "erisilebilirlik",
    title: "Erişilebilirlik Beyanı",
    group: "operasyon",
    classification: "simdilik-gereksiz",
    status: "taslak",
    version: "0.1",
    owner: OWNER_OPS,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge — yasal zorunluluk değil, beyan niteliğinde.",
    summary: "WCAG AA hedefi, bilinen eksikler ve geri bildirim kanalı. Abartılı uyum iddiası içermez.",
    covers: [
      "Hedeflenen standart (WCAG 2.1 AA)",
      "Klavye ve odak desteği",
      "Kontrast ve renk dışı durum anlatımı",
      "Hareket azaltma tercihi",
      "Bilinen sınırlar (şematik haritalar, ekran okuyucu testlerinin yapılmamış olması)",
      "Geri bildirim kanalı",
    ],
    contact: CONTACT_SUPPORT,
  },
  {
    slug: "topluluk-kurallari",
    title: "Topluluk Kuralları",
    group: "operasyon",
    classification: "simdilik-gereksiz",
    status: "taslak",
    version: "0.1",
    owner: OWNER_OPS,
    effectiveDate: "—",
    lastUpdated: "2026-03-11",
    changeSummary: "Yeni belge — kullanıcılar arası etkileşim (yorum) özelliği yok.",
    summary:
      "Kullanıcı yorumu ve değerlendirme özelliği eklenirse geçerli olacak davranış kuralları. Şu an yayına gerek yok.",
    covers: ["Saygılı iletişim", "Yasaklı içerik", "Yaptırım ve itiraz", "Yorum doğruluğu"],
    contact: CONTACT_SUPPORT,
  },
];

const BY_SLUG = new Map<string, Policy>();
for (const policy of POLICIES) {
  BY_SLUG.set(policy.slug, policy);
  for (const alias of policy.aliases ?? []) BY_SLUG.set(alias, policy);
}

export function findPolicy(slug: string): Policy | undefined {
  return BY_SLUG.get(slug);
}

export const POLICY_GROUPS = [
  { key: "gizlilik", label: "Gizlilik ve veri" },
  { key: "sozlesme", label: "Sözleşmeler" },
  { key: "operasyon", label: "Operasyon" },
  { key: "izin", label: "İzinler ve çerezler" },
] as const;

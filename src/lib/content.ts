/**
 * MERKEZİ İÇERİK KAYDI
 *
 * Durum mesajları, boş/hata metinleri, yardım makaleleri, SSS, politika
 * belgeleri ve analitik olay adları burada tutulur. Amaç: aynı cümlenin
 * on bileşende hard-code edilmesini önlemek ve metni tek yerden denetlemek.
 */

/* ---------------------------------- Durumlar --------------------------------- */

export const STATE_COPY = {
  emptyCart: {
    title: "Sepetin boş",
    body: "Bir işletme seç, ürünlerini ekle. Ücret dökümünü onaylamadan sipariş oluşmaz.",
  },
  emptyOrders: { title: "Henüz siparişin yok", body: "Pilot katalogdan ilk siparişini oluşturabilirsin." },
  emptyShipments: { title: "Henüz gönderin yok", body: "Adresleri gir, ücreti gör, gönderiyi oluştur." },
  emptyRides: { title: "Sürüş kaydı yok", body: "Haritadan bir araç seçip kilidini açtığında burada görünür." },
  venueClosed: {
    title: "İşletme şu an kapalı",
    body: "Bu işletme şu an hizmet vermiyor. Benzer mutfakta açık bir işletme seçebilirsin.",
  },
  itemUnavailable: {
    title: "Ürün tükendi",
    body: "Bu ürün şu an menüde yok. Onayın olmadan yerine başka ürün eklenmez.",
  },
  priceChanged: {
    title: "Fiyatlar değişti",
    body: "Sepete ekledikten sonra fiyat güncellendi. Devam etmek için yeni tutarı onayla.",
  },
  belowMinimum: {
    title: "Minimum sepet tutarının altındasın",
    body: "Bu işletmenin minimum sepet tutarına ulaşınca sipariş verebilirsin.",
  },
  outOfZone: {
    title: "Adres hizmet bölgesi dışında",
    body: "Bu adrese teslimat yapamıyoruz. Hizmet bölgelerini kontrol edebilirsin.",
  },
  couponInvalid: { title: "Kupon geçerli değil", body: "Kupon kodunu kontrol et." },
  paymentDeclined: {
    title: "Ödeme tamamlanamadı",
    body: "Bakiye veya ödeme yöntemi yetersiz. Sipariş oluşturulmadı, tekrar deneyebilirsin.",
  },
  noVehicleFound: {
    title: "Uygun araç bulunamadı",
    body: "Bu bölgede şu an kiralanabilir araç yok. Haritayı kaydırıp tekrar bakabilirsin.",
  },
  noDriverService: {
    title: "Sürücülü yolculuk sunulmuyor",
    body:
      "Şu an yalnızca elektrikli araç kiralama hizmeti veriyoruz; sürücülü yolculuk (araç/motosiklet çağırma) hizmet kapsamımızda değil. Sahte sürücü veya bekleme süresi göstermiyoruz.",
  },
  demoCatalog: {
    title: "Pilot katalog",
    body:
      "Bu işletmeler demo verisidir; gerçek bir restoran iş ortağı değildir. Ücret hesaplama, sepet ve sipariş akışı gerçektir, ödeme sağlayıcısı bağlı değildir.",
  },
} as const;

export const ERROR_COPY = {
  unauthorized: "Bu işlem için oturum açman gerekiyor.",
  forbidden: "Bu işlem için yetkin yok.",
  rateLimited: "Çok fazla deneme yaptın. Biraz bekleyip tekrar dene.",
  server: "Beklenmedik bir hata oluştu. İşlem kaydedilmedi, tekrar deneyebilirsin.",
  notFound: "Aradığın kayıt bulunamadı.",
} as const;

/* --------------------------------- Yardım ---------------------------------- */

export type HelpArticle = { slug: string; question: string; answer: string };
export type HelpCategory = { key: string; label: string; articles: HelpArticle[] };

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    key: "yemek",
    label: "Yemek siparişi",
    articles: [
      {
        slug: "pilot-katalog",
        question: "Yemek işletmeleri gerçek mi?",
        answer:
          "Hayır. Katalog şu an pilot aşamada ve demo işletmelerden oluşuyor. Sepet, ücret dökümü ve sipariş akışı gerçek; ödeme sağlayıcısı bağlı değil. Gerçek iş ortakları eklendikçe demo rozeti kalkacak.",
      },
      {
        slug: "ucret-dokumu",
        question: "Sipariş toplamı nasıl hesaplanıyor?",
        answer:
          "Ürün toplamı, indirim, teslimat bedeli, hizmet bedeli ve varsa küçük sepet bedeli ayrı satırlarda gösterilir. Toplam tutar her zaman sunucuda yeniden hesaplanır; tarayıcıdan gelen tutar kabul edilmez.",
      },
      {
        slug: "fiyat-degisti",
        question: "Sepetteki ürünün fiyatı değişirse ne olur?",
        answer:
          "Sipariş onayından önce değişiklik tespit edilir ve senden yeniden onay istenir. Onayın olmadan ürün değiştirilmez veya alternatif ürün eklenmez.",
      },
    ],
  },
  {
    key: "yolculuk",
    label: "Yolculuk",
    articles: [
      {
        slug: "suruculu-yolculuk",
        question: "Sürücülü yolculuk çağırabiliyor muyum?",
        answer:
          "Hayır. Şu an yalnızca elektrikli scooter, e-bisiklet ve moped kiralama hizmeti veriyoruz. Sürücülü yolculuk hizmet kapsamımızda değil ve bu konuda sahte müsaitlik göstermiyoruz.",
      },
      {
        slug: "kilit-acma",
        question: "Araç kilidi nasıl açılıyor?",
        answer:
          "Haritadan araç seçip kirala dediğinde istek sunucuda doğrulanır; kilit açma yetkisi tarayıcıya bırakılmaz. Bataryası %20'nin altındaki araçlar kiralanamaz.",
      },
      {
        slug: "park-kurallari",
        question: "Nereye park edebilirim?",
        answer:
          "Kırmızı alanlar park yasağı bölgesidir. Demoda araç konumu simüle edildiği için bölge kuralları sürüşe henüz uygulanmıyor; bu sınır haritada açıkça belirtilir.",
      },
    ],
  },
  {
    key: "gonder",
    label: "Gönderi",
    articles: [
      {
        slug: "takip-gizlilik",
        question: "Takip sayfasında neden adres görünmüyor?",
        answer:
          "Takip bağlantısı herkese açıktır. Bu yüzden adres, telefon ve alıcının tam adı gösterilmez; alıcı adı maskelenir, konum ilçe seviyesinde paylaşılır.",
      },
      {
        slug: "guvence",
        question: "Teslimat Güvencesi nedir?",
        answer:
          "Tahmini teslim saati aşılırsa kredi otomatik açılır: 20 dakikada %25, bir saatte %50, iki saatte %100. Başarısız teslimatta %100. Talep açmana gerek yok.",
      },
      {
        slug: "yasakli-gonderiler",
        question: "Neler gönderilemez?",
        answer:
          "Yanıcı, patlayıcı, yasa dışı ve mevzuata aykırı içerikler kabul edilmez. Tespit halinde gönderi bloke edilir. Ayrıntı: Yasaklı gönderiler politikası (taslak).",
      },
    ],
  },
  {
    key: "odeme",
    label: "Ödeme ve bakiye",
    articles: [
      {
        slug: "bakiye-nedir",
        question: "Platform bakiyesi nedir?",
        answer:
          "Gönderi ve sürüş ücretlerini tek yerden ödemek için kullanılan demo bakiyedir. Gerçek bir ödeme kuruluşu bağlı olmadığı için elektronik para değildir ve gerçek para tutulmaz.",
      },
      {
        slug: "iade",
        question: "İadeler nasıl işleniyor?",
        answer:
          "Teslimat Güvencesi kredisi ve iptal iadeleri çift taraflı kayıtla platform bakiyesine yazılır. Kayıtlar silinemez; hatalı işlem ters kayıtla düzeltilir.",
      },
    ],
  },
  {
    key: "hesap",
    label: "Hesap ve gizlilik",
    articles: [
      {
        slug: "izinler",
        question: "İzinlerimi nasıl yönetirim?",
        answer:
          "İzin merkezinden ticari ileti, bildirim ve konum izinlerini ayrı ayrı verebilir veya geri çekebilirsin. Aydınlatma metnini onaylamak hizmetin koşulu; pazarlama izni değildir.",
      },
      {
        slug: "hesap-silme",
        question: "Hesabımı silebilir miyim?",
        answer:
          "Talep açabilirsin. Mali kayıtlar yasal saklama süresi boyunca append-only olarak tutulur; kişisel veriler saklama süresi sonunda silinir veya anonimleştirilir.",
      },
    ],
  },
  {
    key: "guvenlik",
    label: "Güvenlik",
    articles: [
      {
        slug: "konum-paylasimi",
        question: "Konumum ne zaman izleniyor?",
        answer:
          "Kurye konumu yalnızca aktif görev sırasında kabul edilir; görevi olmayan kuryenin konum isteği reddedilir ve denetime yazılır. Kullanıcı konumu sürekli arka planda toplanmaz.",
      },
    ],
  },
];

export const ALL_HELP_ARTICLES: (HelpArticle & { category: string; categoryLabel: string })[] =
  HELP_CATEGORIES.flatMap((category) =>
    category.articles.map((article) => ({
      ...article,
      category: category.key,
      categoryLabel: category.label,
    })),
  );

/* ----------------------------------- SSS ----------------------------------- */

export const FAQ = [
  {
    q: "Üç hizmet için ayrı hesap mı gerekiyor?",
    a: "Hayır. Yemek, yolculuk ve gönderi tek hesapla kullanılır; işlem geçmişi ve izinler tek merkezde görünür.",
  },
  {
    q: "Ücreti ne zaman görüyorum?",
    a: "Onaydan önce. Ürün/hizmet bedeli, teslimat, hizmet bedeli ve varsa küçük sepet bedeli ayrı satırlarda gösterilir; son adımda sürpriz ücret çıkmaz.",
  },
  {
    q: "Yemek işletmeleri gerçek mi?",
    a: "Katalog pilot aşamada ve demo işletmelerden oluşuyor; her işletme kartında bu açıkça yazıyor. Sahte puan ve yorum göstermiyoruz.",
  },
  {
    q: "Sürücülü yolculuk var mı?",
    a: "Hayır. Şu an yalnızca elektrikli araç kiralama var. Olmayan bir hizmeti varmış gibi göstermiyoruz.",
  },
  {
    q: "Teslimat süresi garantili mi?",
    a: "Süre garantisi vermiyoruz; tahmini süre gösteriyoruz. Tahmin aşılırsa Teslimat Güvencesi otomatik devreye girer.",
  },
  {
    q: "Konum verim nasıl kullanılıyor?",
    a: "Konum, hizmetin ifası için ve yalnızca gerektiğinde işlenir. Kurye konumu sadece aktif görevde toplanır.",
  },
];

/* ------------------------------- Analitik ---------------------------------- */

/**
 * Sağlayıcıdan bağımsız olay sözlüğü. PII içermez: adres, telefon, e-posta,
 * ödeme bilgisi ve serbest metin olaylara EKLENMEZ.
 */
export const ANALYTICS_EVENTS = [
  "service_selected",
  "location_check_started",
  "location_check_completed",
  "restaurant_viewed",
  "product_added",
  "cart_viewed",
  "coupon_applied",
  "checkout_started",
  "order_completed",
  "ride_quote_requested",
  "ride_started",
  "ride_ended",
  "shipment_quote_requested",
  "shipment_created",
  "tracking_opened",
  "help_article_viewed",
  "support_started",
  "consent_updated",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

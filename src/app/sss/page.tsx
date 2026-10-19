import PageShell from "@/components/PageShell";

export const metadata = { title: "Sıkça Sorulan Sorular — Anbean" };

const FAQ = [
  {
    q: "Takip kodumu nereden bulurum?",
    a: "Gönderi oluşturulduğunda SMS ile gelen bağlantının sonundaki 14 karakterlik koddur. Panelden de kopyalayabilirsiniz.",
  },
  {
    q: "Takip sayfasında neden adres görünmüyor?",
    a: "Takip bağlantısı herkese açıktır. Adres, telefon ve alıcı tam adı gösterilmez; yalnızca ilçe seviyesinde bilgi paylaşılır.",
  },
  {
    q: "Renk şeridi ne anlama geliyor?",
    a: "Altı segmentin her biri bir operasyon aşamasıdır. Dolu segmentler tamamlanan aşamaları, soluk olanlar kalan yolu gösterir. Kırmızı segment istisna, mor segment iade sürecidir.",
  },
  {
    q: "Kapıda ödeme var mı?",
    a: "Bu sürümde yok. Tahsilat mutabakatı tamamlandığında devreye alınacaktır. Şimdilik ön ödemeli ve kurumsal faturalı çalışıyoruz.",
  },
  {
    q: "Teslimat başarısız olursa ne olur?",
    a: "Gönderi istisna kuyruğuna düşer. Operasyon ekibi yeniden planlar veya iade sürecini başlatır; her iki durumda da şerit rengi değişir.",
  },
  {
    q: "Hangi şehirlerde hizmet veriyorsunuz?",
    a: "Şu anda İstanbul'da 19 ilçede şehir içi ve aynı gün teslim. Ankara ve İzmir pilot aşamasında.",
  },
];

export default function SssPage() {
  return (
    <PageShell eyebrow="Destek" title="Sıkça sorulan sorular" lead="Operasyonla ilgili en sık gelen altı soru.">
      <div className="grid gap-4 md:grid-cols-2">
        {FAQ.map((item) => (
          <details key={item.q} className="group rounded-lg border border-white/10 bg-white/3 p-5">
            <summary className="cursor-pointer list-none font-semibold text-white">
              <span className="mr-2 text-accent">+</span>
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.a}</p>
          </details>
        ))}
      </div>
    </PageShell>
  );
}

import PageShell from "@/components/PageShell";

export const metadata = { title: "İletişim — Anbean" };

export default function IletisimPage() {
  return (
    <PageShell
      eyebrow="Destek"
      title="Operasyonla doğrudan konuş"
      lead="Teslimat talimatı değişikliği ve istisna yönetimi için destek hattı 08:00–22:00 arası açıktır."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {[
          { title: "Destek hattı", value: "0850 000 00 00", note: "Her gün 08:00 – 22:00" },
          { title: "E-posta", value: "destek@anbean.com.tr", note: "Ortalama yanıt 2 saat" },
          { title: "Kurumsal satış", value: "kurumsal@anbean.com.tr", note: "Hacim ve API görüşmeleri" },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-white/10 bg-white/3 p-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{item.title}</p>
            <p className="mt-3 font-display text-lg font-semibold text-white">{item.value}</p>
            <p className="mt-1 text-xs text-slate-500">{item.note}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-lg border border-white/10 bg-white/3 p-6">
        <h2 className="text-lg font-semibold text-white">Merkez ofis</h2>
        <p className="mt-2 text-sm text-slate-400">
          Caferağa Mah. Moda Cad. No:12 K:3 · Kadıköy / İstanbul
        </p>
      </div>
    </PageShell>
  );
}

import PageShell from "@/components/PageShell";
import StatusStrip from "@/components/StatusStrip";

export const metadata = { title: "Blog — Anbean" };

const POSTS = [
  {
    title: "Teslimat durumunu renkle anlatmak",
    excerpt: "Metin yerine renk şeridi kullanınca destek çağrıları neden üçte bir azalıyor?",
    tag: "Tasarım",
    status: "teslim_edildi",
  },
  {
    title: "İstisna kuyruğu: başarısız teslimatın anatomisi",
    excerpt: "Başarısız teslimatların %62'si üç nedene dayanıyor. Operasyonda bunu nasıl ölçüyoruz?",
    tag: "Operasyon",
    status: "teslimat_denemesi_basarisiz",
  },
  {
    title: "Kurye ekranı tek elle nasıl kullanılır?",
    excerpt: "56 piksel dokunma hedefi, iki aksiyon kuralı ve sürüş güvenliği.",
    tag: "Ürün",
    status: "dagitima_cikti",
  },
];

export default function BlogPage() {
  return (
    <PageShell eyebrow="Blog" title="Operasyon notları" lead="Sahadan çıkan ölçümler ve ürün kararları.">
      <div className="grid gap-5 md:grid-cols-3">
        {POSTS.map((post) => (
          <article key={post.title} className="rounded-lg border border-white/10 bg-white/3 p-6">
            <span className="rounded-sm bg-white/8 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-slate-400">
              {post.tag}
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">{post.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{post.excerpt}</p>
            <StatusStrip status={post.status} size="sm" className="mt-6" />
          </article>
        ))}
      </div>
    </PageShell>
  );
}

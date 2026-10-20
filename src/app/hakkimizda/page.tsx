import PageShell from "@/components/PageShell";
import { db } from "@/db";
import { cmsPages } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hakkımızda — Anbean" };

export default async function HakkimizdaPage() {
  const rows = await db.select().from(cmsPages).where(eq(cmsPages.slug, "hakkimizda")).catch(() => []);
  const page = rows[0];

  return (
    <PageShell eyebrow="Kurum" title="Vaadimiz hız değil, görünürlük" lead={page?.body}>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Neden kurulduk",
            body: "Şehir içi teslimatta asıl maliyet gecikme değil, belirsizliktir. Müşteriyi arayan operasyon ekibi zaman kaybeder.",
          },
          {
            title: "Nasıl çalışıyoruz",
            body: "Sözleşmeli esnek vardiya modeliyle kurye ağı, bölge bazlı atama ve istisna kuyruğu üzerinden operasyon yönetimi.",
          },
          {
            title: "Neye yatırım yapıyoruz",
            body: "Durum makinesi, denetim kaydı ve kanıtlı teslim. Her geçiş yazılır; hiçbir kayıt sonradan silinemez.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-white/10 bg-white/3 p-6">
            <h2 className="text-lg font-semibold text-white">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{item.body}</p>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

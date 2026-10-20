import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { consents } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import PanelShell, { Card } from "@/components/PanelShell";
import ConsentToggles, { type ConsentRow } from "@/components/ConsentToggles";

export const dynamic = "force-dynamic";
export const metadata = { title: "İzinler — Anbean" };

const CATEGORIES = ["aydinlatma", "ticari_iletisim", "konum", "bildirim", "cerez_analitik"];

export default async function IzinlerPage() {
  const user = await requireAuth();
  if (!user) redirect("/giris");

  const rows = await db.select().from(consents).where(eq(consents.userId, user.id)).orderBy(desc(consents.createdAt));
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) if (!latest.has(row.category)) latest.set(row.category, row);

  const initial: ConsentRow[] = CATEGORIES.map((category) => ({
    category,
    granted: latest.get(category)?.granted ?? false,
    policyVersion: latest.get(category)?.policyVersion ?? "0.1",
  }));

  return (
    <PanelShell
      role={user.role}
      userName={user.fullName}
      title="Hesap ve gizlilik · izinler"
      subtitle="Aydınlatma ile açık rıza ayrı tutulur. Verme ve geri çekme aynı görünürlükte; her değişiklik sürüm ve zaman damgasıyla kaydedilir."
      nav={[
        { href: "/app", label: "İşlemlerim" },
        { href: "/app/cuzdan", label: "Bakiye" },
        { href: "/hesap/izinler", label: "İzinler" },
        { href: "/app/destek", label: "Destek" },
      ]}
    >
      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <Card title="İzinlerim">
          <ConsentToggles initial={initial} />
        </Card>

        <div className="space-y-5">
          <Card title="Kayıt geçmişi">
            {rows.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">
                Henüz izin kaydı yok. Bir tercihi değiştirdiğinde sürüm ve zaman damgasıyla buraya yazılır.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {rows.slice(0, 20).map((row) => (
                  <li key={row.id} className="py-2.5">
                    <p className="text-slate-800">
                      {row.category.replaceAll("_", " ")} ·{" "}
                      <span className={row.granted ? "text-green-700" : "text-st-risk"}>
                        {row.granted ? "verildi" : "geri çekildi"}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      v{row.policyVersion} · {row.source} · {new Date(row.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] text-slate-500">
              Kayıtlar append-only tutulur: eski izin silinmez, yeni kayıt eklenir.
            </p>
          </Card>

          <Card title="Belgeler">
            <ul className="space-y-2 text-sm">
              {[
                { href: "/yasal/kvkk-aydinlatma", label: "KVKK aydınlatma metni" },
                { href: "/yasal/gizlilik-politikasi", label: "Gizlilik politikası" },
                { href: "/yasal/konum-verisi-aydinlatma", label: "Konum verisi aydınlatması" },
                { href: "/yasal/ticari-iletisim", label: "Ticari elektronik ileti izni" },
                { href: "/yasal/cerez-politikasi", label: "Çerez politikası" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-accent underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                  <span className="ml-2 text-[11px] text-slate-500">taslak</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </PanelShell>
  );
}

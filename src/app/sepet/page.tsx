import PageShell from "@/components/PageShell";
import CartClient from "@/components/CartClient";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Sepet — Anbean",
  description: "Ürünler, indirimler, teslimat ve hizmet bedeli ayrı satırlarda. Toplam tutar sunucuda hesaplanır.",
};

export default async function SepetPage() {
  const user = await getSessionUser();

  return (
    <PageShell
      eyebrow="Sepet"
      title="Ücreti gör, sonra karar ver"
      lead="Son adımda sürpriz ücret çıkmaz. Fiyat veya stok değiştiyse onayın yeniden istenir; onayın olmadan ürün değiştirilmez."
    >
      <CartClient loggedIn={Boolean(user)} />
    </PageShell>
  );
}

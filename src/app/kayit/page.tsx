import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/SiteChrome";
import { RegisterForm } from "@/components/AuthForms";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hesap oluştur — Anbean" };

export default async function KayitPage() {
  const user = await getSessionUser();
  if (user) redirect("/app");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep px-5 py-16">
      <div className="route-lines absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-lg">
        <Link href="/" className="flex justify-center text-white">
          <BrandMark />
        </Link>
        <h1 className="mt-8 text-center text-3xl font-bold text-white">Hesap oluştur</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Tek hesap, tek cüzdan: kurye gönder ve elektrikli araç kirala.
        </p>
        <div className="mt-8">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}

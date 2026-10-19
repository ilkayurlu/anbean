import Link from "next/link";
import { BrandMark } from "@/components/SiteChrome";
import { ForgotPasswordForm } from "@/components/AuthForms";

export const metadata = { title: "Şifremi unuttum — Anbean" };

export default function SifremiUnuttumPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep px-5 py-16">
      <div className="route-lines absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md">
        <Link href="/" className="flex justify-center text-white">
          <BrandMark size="sm" />
        </Link>
        <h1 className="mt-8 text-center text-3xl font-bold text-white">Şifreni sıfırla</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Kayıtlı e-postana 30 dakika geçerli bir bağlantı göndeririz.
        </p>
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}

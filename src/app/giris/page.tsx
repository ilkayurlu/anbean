import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { BrandMark } from "@/components/SiteChrome";

export const metadata = { title: "Giriş — Anbean" };

export default function GirisPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-deep px-5 py-16">
      <div className="route-lines absolute inset-0" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="flex justify-center text-white">
          <BrandMark />
        </Link>
        <h1 className="mt-8 text-center text-3xl font-bold text-white">Panele giriş</h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Rolün giriş sonrası doğru panele yönlendirir. Rol yükseltme denemeleri denetime yazılır.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

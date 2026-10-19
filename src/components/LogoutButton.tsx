"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/giris");
        router.refresh();
      }}
      className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-slate-200 transition hover:border-white/40"
    >
      Çıkış
    </button>
  );
}

import type { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "./SiteChrome";

export default function PageShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-deep">
      <SiteHeader />
      <section className="relative overflow-hidden border-b border-white/8">
        <div className="route-lines absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold text-white sm:text-5xl">{title}</h1>
          {lead ? <p className="mt-4 max-w-2xl text-lg text-slate-400">{lead}</p> : null}
        </div>
      </section>
      <main className="mx-auto max-w-6xl px-5 py-14">{children}</main>
      <SiteFooter />
    </div>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "./SiteChrome";
import LogoutButton from "./LogoutButton";
import GlobalSearch from "./GlobalSearch";
import { ROLE_LABEL, type Role } from "@/lib/auth";

export default function PanelShell({
  role,
  userName,
  title,
  subtitle,
  nav,
  children,
}: {
  role: Role;
  userName: string;
  title: string;
  subtitle?: string;
  nav: { href: string; label: string }[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-panel text-[#0B1220]">
      <header className="bg-deep">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-white">
              <BrandMark size="sm" />
            </Link>
            <nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className="transition hover:text-white">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <span className="hidden text-xs text-slate-400 sm:block">
              {userName} · {ROLE_LABEL[role]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#0B1220]">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
          </div>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(11,18,32,0.05)]">
      {title ? (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Metric({ label, value, tone = "#0B1220" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold" style={{ color: tone }}>
        {value}
      </p>
    </div>
  );
}

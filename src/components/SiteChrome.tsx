import Link from "next/link";
import { BRAND, CTA, MODULES } from "@/lib/brand";
import { STATUS_COLOR } from "@/lib/status";
import CartLink from "./CartLink";
import GlobalSearch from "./GlobalSearch";

export { BRAND };

export function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  const segments: (keyof typeof STATUS_COLOR)[] = ["waiting", "transit", "transit", "delivered"];
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex gap-[3px]" aria-hidden>
        {segments.map((kind, i) => (
          <span
            key={i}
            className={`${size === "sm" ? "h-4 w-[5px]" : "h-5 w-1.5"} rounded-[2px]`}
            style={{ backgroundColor: STATUS_COLOR[kind], opacity: 0.55 + i * 0.15 }}
          />
        ))}
      </span>
      <span className={`font-display font-bold tracking-tight ${size === "sm" ? "text-base" : "text-lg"}`}>
        {BRAND.name}
      </span>
    </span>
  );
}

const NAV = [
  { href: "/yemek", label: "Yemek" },
  { href: "/yolculuk", label: "Yolculuk" },
  { href: "/gonder", label: "Gönder" },
  { href: "/kurumsal", label: "Kurumsal" },
  { href: "/nasil-calisir", label: "Nasıl Çalışır?" },
  { href: "/guvenlik", label: "Güvenlik" },
  { href: "/yardim", label: "Yardım" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-[#0b1220]/88 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="shrink-0 text-white">
          <BrandMark />
        </Link>
        <nav aria-label="Ana gezinme" className="hidden items-center gap-5 text-sm text-slate-300 lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <GlobalSearch />
          <CartLink />
          <Link
            href="/giris"
            className="hidden rounded-md border border-white/15 px-3 py-2 text-sm text-slate-200 transition hover:border-white/35 sm:block"
          >
            {CTA.login}
          </Link>
          <Link
            href="/kayit"
            className="rounded-md bg-accent px-3.5 py-2 text-sm font-semibold text-[#0B1220] transition hover:bg-accent-soft"
          >
            {CTA.start}
          </Link>
        </div>
      </div>
      {/* Dar ekranlarda ana hizmetler kaydırılabilir şeritte kalır. */}
      <nav aria-label="Hizmetler" className="flex gap-1 overflow-x-auto border-t border-white/8 px-4 py-2 lg:hidden">
        {NAV.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-full border border-white/12 px-3 py-1.5 text-xs text-slate-300"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

const FOOTER = [
  {
    title: "Hizmetler",
    links: [
      { href: "/yemek", label: "Yemek" },
      { href: "/yolculuk", label: "Yolculuk" },
      { href: "/gonder", label: "Gönderi" },
      { href: "/kurumsal", label: "Kurumsal çözümler" },
      { href: "/fiyat-al", label: "Ücret hesapla" },
    ],
  },
  {
    title: "İş Ortaklığı",
    links: [
      { href: "/restoran-basvuru", label: "Restoran başvurusu" },
      { href: "/kurye-basvur", label: "Kurye/sürücü başvurusu" },
      { href: "/filo-is-ortakligi", label: "Filo iş ortaklığı" },
      { href: "/kurumsal", label: "API ve entegrasyonlar" },
    ],
  },
  {
    title: "Şirket",
    links: [
      { href: "/hakkimizda", label: "Hakkımızda" },
      { href: "/guvenlik", label: "Güvenlik" },
      { href: "/surdurulebilirlik", label: "Sürdürülebilirlik" },
      { href: "/blog", label: "Blog" },
      { href: "/iletisim", label: "İletişim" },
    ],
  },
  {
    title: "Yardım",
    links: [
      { href: "/yardim", label: "Yardım merkezi" },
      { href: "/sss", label: "Sık sorulanlar" },
      { href: "/yasal/iptal-iade", label: "İptal ve iade" },
      { href: "/yasal/yasakli-gonderiler", label: "Yasaklı gönderiler" },
      { href: "/yasal/yolculuk-kurallari", label: "Yolculuk kuralları" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { href: "/yasal/gizlilik-politikasi", label: "Gizlilik" },
      { href: "/yasal/kvkk-aydinlatma", label: "KVKK" },
      { href: "/yasal/cerez-politikasi", label: "Çerezler" },
      { href: "/yasal/kullanim-kosullari", label: "Kullanım koşulları" },
      { href: "/hesap/izinler", label: "Ticari ileti tercihleri" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/8 bg-[#0a101c]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-5">
        {FOOTER.map((column) => (
          <div key={column.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{column.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {column.links.map((link) => (
                <li key={`${column.title}-${link.label}`}>
                  <Link href={link.href} className="transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/8 px-5 py-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.legalName} · {BRAND.support.phone}
          </p>
          <p>
            Görseller: Pexels · Haritalar şematiktir, harici harita verisi kullanılmaz · Yasal belgeler taslak
            aşamasındadır
          </p>
        </div>
        <p className="mx-auto mt-3 max-w-6xl text-[11px] text-slate-600">
          Hizmet modülleri:{" "}
          {MODULES.map((module) => `${module.label} (${module.status === "hazir" ? "açık" : module.status === "pilot" ? "pilot" : "sunulmuyor"})`).join(
            " · ",
          )}
          . Platform bakiyesi demo amaçlıdır, elektronik para değildir.
        </p>
      </div>
    </footer>
  );
}

/**
 * ANBEAN — gönderi durum makinesi ve Durum Renk Şeridi tanımları.
 * Tek kaynak: hero, takip sonucu, müşteri listesi, kurye kartı ve ops paneli
 * bu dosyadaki renk/etiketleri kullanır.
 */

export type StatusKind = "delivered" | "waiting" | "risk" | "transit" | "return" | "neutral";

export const STATUS_COLOR: Record<StatusKind, string> = {
  delivered: "#16A34A",
  waiting: "#F59E0B",
  risk: "#DC2626",
  transit: "#2563EB",
  return: "#7C3AED",
  neutral: "#64748B",
};

export type StatusKey =
  | "taslak"
  | "fiyat_onayi_bekliyor"
  | "alim_planlandi"
  | "kurye_atamasi_bekliyor"
  | "kurye_atandi"
  | "alima_gidiyor"
  | "gonderi_alindi"
  | "aktarma_merkezinde"
  | "dagitima_cikti"
  | "teslim_edildi"
  | "teslimat_denemesi_basarisiz"
  | "yeniden_planlandi"
  | "iade_surecinde"
  | "iade_edildi"
  | "iptal"
  | "incelemede"
  | "bloke"
  | "arsivlendi";

type StatusDef = {
  label: string;
  kind: StatusKind;
  /** şeritte kaçıncı ana aşamaya denk geliyor (0 = henüz başlamadı) */
  stage: number;
  publicNote: string;
};

export const STATUS: Record<StatusKey, StatusDef> = {
  taslak: { label: "Taslak", kind: "neutral", stage: 0, publicNote: "Gönderi hazırlanıyor." },
  fiyat_onayi_bekliyor: {
    label: "Fiyat Onayı Bekliyor",
    kind: "waiting",
    stage: 0,
    publicNote: "Teklif onayı bekleniyor.",
  },
  alim_planlandi: { label: "Alım Planlandı", kind: "waiting", stage: 1, publicNote: "Alım planlandı." },
  kurye_atamasi_bekliyor: {
    label: "Kurye Ataması Bekliyor",
    kind: "waiting",
    stage: 1,
    publicNote: "Kurye aranıyor.",
  },
  kurye_atandi: { label: "Kurye Atandı", kind: "transit", stage: 2, publicNote: "Kurye atandı." },
  alima_gidiyor: { label: "Alıma Gidiyor", kind: "transit", stage: 2, publicNote: "Kurye alım noktasına gidiyor." },
  gonderi_alindi: { label: "Gönderi Alındı", kind: "transit", stage: 3, publicNote: "Gönderi teslim alındı." },
  aktarma_merkezinde: {
    label: "Aktarma Merkezinde",
    kind: "transit",
    stage: 4,
    publicNote: "Aktarma merkezinde işlem görüyor.",
  },
  dagitima_cikti: { label: "Dağıtıma Çıktı", kind: "transit", stage: 5, publicNote: "Dağıtıma çıktı." },
  teslim_edildi: { label: "Teslim Edildi", kind: "delivered", stage: 6, publicNote: "Teslim edildi." },
  teslimat_denemesi_basarisiz: {
    label: "Teslimat Denemesi Başarısız",
    kind: "risk",
    stage: 5,
    publicNote: "Teslimat denemesi sonuçsuz kaldı.",
  },
  yeniden_planlandi: {
    label: "Yeniden Planlandı",
    kind: "waiting",
    stage: 5,
    publicNote: "Teslimat yeniden planlandı.",
  },
  iade_surecinde: { label: "İade Sürecinde", kind: "return", stage: 5, publicNote: "İade süreci başlatıldı." },
  iade_edildi: { label: "İade Edildi", kind: "return", stage: 6, publicNote: "Gönderi göndericiye iade edildi." },
  iptal: { label: "İptal", kind: "risk", stage: 0, publicNote: "Gönderi iptal edildi." },
  incelemede: { label: "İncelemede", kind: "waiting", stage: 0, publicNote: "Gönderi inceleniyor." },
  bloke: { label: "Bloke", kind: "risk", stage: 0, publicNote: "Gönderi bloke edildi." },
  arsivlendi: { label: "Arşivlendi", kind: "neutral", stage: 6, publicNote: "Arşivlendi." },
};

export const STATUS_KEYS = Object.keys(STATUS) as StatusKey[];

export function isStatusKey(value: string): value is StatusKey {
  return Object.prototype.hasOwnProperty.call(STATUS, value);
}

export function statusDef(value: string): StatusDef {
  return isStatusKey(value) ? STATUS[value] : STATUS.taslak;
}

export function statusColor(value: string): string {
  return STATUS_COLOR[statusDef(value).kind];
}

/** Durum Renk Şeridi'nin sabit 6 segmenti. */
export const STRIP_SEGMENTS: { key: string; label: string; short: string; kind: StatusKind }[] = [
  { key: "planlandi", label: "Alım Planlandı", short: "Plan", kind: "waiting" },
  { key: "atandi", label: "Kurye Atandı", short: "Atama", kind: "transit" },
  { key: "alindi", label: "Gönderi Alındı", short: "Alım", kind: "transit" },
  { key: "aktarma", label: "Aktarma", short: "Aktarma", kind: "transit" },
  { key: "dagitim", label: "Dağıtımda", short: "Dağıtım", kind: "transit" },
  { key: "teslim", label: "Teslim", short: "Teslim", kind: "delivered" },
];

/** Geçerli durum geçişleri — sunucu tarafında zorunlu kılınır. */
export const TRANSITIONS: Record<StatusKey, StatusKey[]> = {
  taslak: ["fiyat_onayi_bekliyor", "alim_planlandi", "iptal"],
  fiyat_onayi_bekliyor: ["alim_planlandi", "iptal", "incelemede"],
  alim_planlandi: ["kurye_atamasi_bekliyor", "iptal", "incelemede"],
  kurye_atamasi_bekliyor: ["kurye_atandi", "iptal", "incelemede", "bloke"],
  kurye_atandi: ["alima_gidiyor", "kurye_atamasi_bekliyor", "iptal"],
  alima_gidiyor: ["gonderi_alindi", "kurye_atamasi_bekliyor", "iptal"],
  gonderi_alindi: ["aktarma_merkezinde", "dagitima_cikti", "incelemede"],
  aktarma_merkezinde: ["dagitima_cikti", "incelemede"],
  dagitima_cikti: ["teslim_edildi", "teslimat_denemesi_basarisiz", "incelemede"],
  teslim_edildi: ["arsivlendi"],
  teslimat_denemesi_basarisiz: ["yeniden_planlandi", "iade_surecinde", "incelemede"],
  yeniden_planlandi: ["dagitima_cikti", "iade_surecinde", "iptal"],
  iade_surecinde: ["iade_edildi", "incelemede"],
  iade_edildi: ["arsivlendi"],
  iptal: ["arsivlendi"],
  incelemede: ["kurye_atamasi_bekliyor", "dagitima_cikti", "iptal", "bloke"],
  bloke: ["incelemede", "iptal"],
  arsivlendi: [],
};

export function canTransition(from: string, to: string): boolean {
  if (!isStatusKey(from) || !isStatusKey(to)) return false;
  return TRANSITIONS[from].includes(to);
}

/** Telefon/adres gibi PII'yi public takip yanıtında maskele. */
export function maskName(full: string): string {
  return full
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toLocaleUpperCase("tr-TR")}${"*".repeat(Math.max(part.length - 1, 1))}`)
    .join(" ");
}

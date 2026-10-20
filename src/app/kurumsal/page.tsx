import PageShell from "@/components/PageShell";
import StatusStrip from "@/components/StatusStrip";

export const metadata = { title: "Kurumsal & API — Anbean" };

const SAMPLE = `POST /api/v1/shipments
Authorization: Bearer ab_live_••••••••

{
  "tariffCode": "kurumsal",
  "pickup":  { "district": "Şişli",   "address": "…" },
  "drop":    { "district": "Kadıköy", "address": "…" },
  "weightGrams": 1800
}

200 OK
{
  "code": "AB-2026-001042",
  "trackingToken": "K7M2QX9PLR4TBN",
  "status": "kurye_atamasi_bekliyor",
  "etaAt": "2026-03-11T16:40:00+03:00",
  "strip": ["waiting","idle","idle","idle","idle","idle"]
}`;

export default function KurumsalPage() {
  return (
    <PageShell
      eyebrow="Kurumsal"
      title="SLA, API ve mutabakat tek sözleşmede"
      lead="Gönderi oluşturmadan faturaya kadar tüm akış programlanabilir. Durum geçişleri webhook ile anında düşer."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-white/10 bg-[#0a101c] p-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Canlı API yanıtı</p>
          <pre className="mt-4 overflow-x-auto text-[12.5px] leading-relaxed text-slate-300">
            <code>{SAMPLE}</code>
          </pre>
        </div>

        <div className="space-y-5">
          {[
            {
              title: "SLA raporlaması",
              body: "Zamanında teslim oranı, ortalama alım süresi ve istisna dağılımı aylık rapor olarak iletilir.",
              status: "teslim_edildi",
            },
            {
              title: "Webhook bildirimleri",
              body: "Her durum geçişinde imzalı POST. Aynı olay iki kez işlenmez; idempotency anahtarı zorunludur.",
              status: "dagitima_cikti",
            },
            {
              title: "Mutabakat ve ledger",
              body: "Her tahsilat çift taraflı kayda yazılır; ay sonu bakiye farkı sıfırlanmadan dönem kapanmaz.",
              status: "gonderi_alindi",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-white/10 bg-white/3 p-6">
              <h2 className="text-lg font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{item.body}</p>
              <StatusStrip status={item.status} size="sm" className="mt-5" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/4 text-xs uppercase tracking-[0.1em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Paket</th>
              <th className="px-5 py-3">Aylık hacim</th>
              <th className="px-5 py-3">SLA</th>
              <th className="px-5 py-3">Entegrasyon</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 text-slate-300">
            {[
              ["Başlangıç", "0 – 500", "5 saat", "Panel + CSV"],
              ["Büyüme", "500 – 5.000", "4 saat", "REST API + webhook"],
              ["Kurumsal", "5.000+", "Sözleşmeli", "API + özel rota kuralları"],
            ].map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={i} className="px-5 py-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

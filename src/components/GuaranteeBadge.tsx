import { STATUS_COLOR } from "@/lib/status";
import { formatTry } from "@/lib/pricing";
import type { SlaCredit } from "@/db/schema";

export default function GuaranteeBadge({
  credits,
  minutesLate,
}: {
  credits: SlaCredit[];
  minutesLate: number;
}) {
  const total = credits.reduce((sum, row) => sum + row.amountKurus, 0);

  if (credits.length === 0) {
    return (
      <div className="rounded-lg border border-accent/25 bg-accent/8 p-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <p className="text-sm font-semibold text-white">Teslimat Güvencesi aktif</p>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Tahmini teslim saati aşılırsa teslimat ücretinin bir kısmı{" "}
          <strong className="text-slate-200">siz talep etmeden</strong> iade edilir. 20 dk aşımda %25, 1 saatte
          %50, 2 saatte %100.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-5"
      style={{ borderColor: `${STATUS_COLOR.delivered}55`, backgroundColor: `${STATUS_COLOR.delivered}12` }}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR.delivered }} />
        <p className="text-sm font-semibold text-white">Güvence devreye girdi — {formatTry(total)} iade edildi</p>
      </div>
      <ul className="mt-3 space-y-2">
        {credits.map((credit) => (
          <li key={credit.id} className="text-sm text-slate-300">
            <span className="font-semibold">%{credit.ratePercent}</span> · {credit.note}
          </li>
        ))}
      </ul>
      {minutesLate > 0 ? (
        <p className="mt-3 text-xs text-slate-500">Tahmini saate göre {minutesLate} dakika aşım ölçüldü.</p>
      ) : null}
    </div>
  );
}

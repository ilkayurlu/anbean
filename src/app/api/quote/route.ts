import { calculateQuote } from "@/lib/pricing";
import { rateLimit } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`quote:${ip}`, 60, 60_000)) {
    return Response.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const quote = await calculateQuote({
      tariffCode: String(body.tariffCode ?? "sehir_ici"),
      distanceKm: Number(body.distanceKm ?? 5),
      weightGrams: Number(body.weightGrams ?? 1000),
      dropDistrict: body.dropDistrict ? String(body.dropDistrict) : undefined,
    });
    return Response.json(quote);
  } catch {
    return Response.json({ error: "Fiyat hesaplanamadı" }, { status: 400 });
  }
}

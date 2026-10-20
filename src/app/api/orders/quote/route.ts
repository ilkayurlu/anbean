import { headers } from "next/headers";
import { z } from "zod";
import { evaluateCart } from "@/lib/food";
import { rateLimit } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  restaurantSlug: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(60),
  lines: z
    .array(z.object({ menuItemId: z.number().int().positive(), quantity: z.number().int().min(1).max(20) }))
    .max(40),
  couponCode: z.string().trim().max(30).optional(),
  tipKurus: z.number().int().min(0).max(100_000).optional(),
  acknowledgedPrices: z.record(z.string(), z.number().int().nonnegative()).optional(),
});

/** Sepet tutar özeti. Tutarlar yalnızca burada, sunucuda hesaplanır. */
export async function POST(req: Request) {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`quote-food:${ip}`, 120, 60_000)) {
    return Response.json({ error: "Çok fazla istek" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz sepet" }, { status: 400 });
  }

  const evaluation = await evaluateCart(parsed.data);
  if ("error" in evaluation) return Response.json({ error: evaluation.error }, { status: 404 });
  return Response.json(evaluation);
}

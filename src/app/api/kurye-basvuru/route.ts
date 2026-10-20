import { db } from "@/db";
import { courierApplications } from "@/db/schema";
import { rateLimit, writeAudit } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const head = await headers();
  const ip = head.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`apply:${ip}`, 5, 60_000)) {
    return Response.json({ error: "Çok fazla başvuru denemesi." }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const fullName = String(body.fullName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  if (fullName.length < 3 || phone.replace(/\D/g, "").length < 10) {
    return Response.json({ error: "Ad soyad ve geçerli telefon zorunludur." }, { status: 400 });
  }

  const [row] = await db
    .insert(courierApplications)
    .values({
      fullName: fullName.slice(0, 120),
      phone: phone.slice(0, 20),
      city: String(body.city ?? "İstanbul").slice(0, 60),
      vehicle: String(body.vehicle ?? "motosiklet").slice(0, 40),
      experience: String(body.experience ?? "").slice(0, 500),
    })
    .returning();

  // PII loglanmaz — yalnızca kayıt kimliği.
  await writeAudit({ action: "kurye_basvurusu", entity: "courier_application", entityId: String(row.id) });

  return Response.json({ ok: true, id: row.id });
}

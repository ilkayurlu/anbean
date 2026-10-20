import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureDemoData } from "@/lib/seed";
import { ensureFleetSeed } from "@/lib/fleet-seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    try {
      await ensureDemoData();
      await ensureFleetSeed();
    } catch {
      // demo verisi opsiyoneldir, sağlık kontrolünü düşürmez
    }
    return Response.json({ ok: true, service: "anbean" });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

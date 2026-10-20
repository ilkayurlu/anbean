import { db } from "@/db";
import { iotVehicles, geoFences, fieldTasks } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const district = url.searchParams.get("district");

  let vehicles = await db.select().from(iotVehicles);
  if (kind) vehicles = vehicles.filter((v) => v.kind === kind);
  if (district) vehicles = vehicles.filter((v) => v.district === district);

  const fences = await db.select().from(geoFences).where(eq(geoFences.isActive, true));
  const tasks = await db.select().from(fieldTasks).where(eq(fieldTasks.status, "acik"));

  // Master prompt Moat #2: ölü saat kalmaması için açık görev sayısı her araç başına hesaplanır.
  const vehicleTaskCounts = new Map<number, number>();
  for (const task of tasks) {
    if (task.vehicleId) {
      vehicleTaskCounts.set(task.vehicleId, (vehicleTaskCounts.get(task.vehicleId) ?? 0) + 1);
    }
  }

  return Response.json({
    vehicles: vehicles.map((v) => ({
      ...v,
      openTaskCount: vehicleTaskCounts.get(v.id) ?? 0,
    })),
    fences: fences.map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
      polygon: f.polygon,
      speedKph: f.speedKph,
      surgeMultiplier: f.surgeMultiplier,
    })),
    openTasks: tasks,
    summary: {
      available: vehicles.filter((v) => v.status === "available").length,
      lowBattery: vehicles.filter((v) => v.batteryPercent < 30).length,
      inUse: vehicles.filter((v) => v.status === "in_use").length,
    },
  });
}

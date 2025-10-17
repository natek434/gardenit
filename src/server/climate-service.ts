import { prisma } from "@/src/lib/prisma";
import { withCache } from "@/src/lib/cache";

export function getClimateZones() {
  return withCache("climate-zones", () => prisma.climateZone.findMany({ orderBy: { name: "asc" } }));
}

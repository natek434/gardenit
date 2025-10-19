import { prisma } from "@/src/lib/prisma";

export function getClimateZones() {
  return prisma.climateZone.findMany({
    select: {
      id: true,
      name: true,
      country: true,
      frostFirst: true,
      frostLast: true,
      notes: true,
    },
    orderBy: { name: "asc" },
  });
}

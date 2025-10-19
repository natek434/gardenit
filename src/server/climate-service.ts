import { prisma } from "@/src/lib/prisma";

export function getClimateZones() {
  return prisma.climateZone.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });
}

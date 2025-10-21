import { prisma } from "@/src/lib/prisma";

export function getCompatibility(plantIds: string[]) {
  return prisma.companion.findMany({
    where: {
      OR: [
        { plantId: { in: plantIds } },
        { targetPlantId: { in: plantIds } },
      ],
    },
    include: {
      plant: { select: { id: true, commonName: true } },
      targetPlant: { select: { id: true, commonName: true } },
    },
  });
}

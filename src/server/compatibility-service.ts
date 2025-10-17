import { prisma } from "@/src/lib/prisma";

export function getCompatibility(plantIds: string[]) {
  return prisma.companion.findMany({
    where: {
      OR: [
        { plantAId: { in: plantIds } },
        { plantBId: { in: plantIds } },
      ],
    },
    include: {
      plantA: { select: { id: true, commonName: true } },
      plantB: { select: { id: true, commonName: true } },
    },
  });
}

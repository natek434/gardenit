import { prisma } from "@/src/lib/prisma";
import { scheduleCareReminders } from "@/src/jobs/scheduler";

export async function upsertGarden(userId: string, data: { id?: string; name: string; widthCm: number; heightCm: number }) {
  if (data.id) {
    return prisma.garden.update({
      where: { id: data.id },
      data: { name: data.name, widthCm: data.widthCm, heightCm: data.heightCm },
    });
  }
  return prisma.garden.create({
    data: { name: data.name, widthCm: data.widthCm, heightCm: data.heightCm, userId },
  });
}

export async function createPlanting(
  bedId: string,
  plantId: string,
  startDate: Date,
  quantity?: number,
  notes?: string,
) {
  const planting = await prisma.planting.create({
    data: { bedId, plantId, startDate, quantity, notes },
  });
  await scheduleCareReminders(planting.id);
  return planting;
}

export function getPlantingsByUser(userId: string) {
  return prisma.planting.findMany({
    where: { bed: { garden: { userId } } },
    include: {
      plant: true,
      bed: true,
    },
    orderBy: { startDate: "desc" },
  });
}

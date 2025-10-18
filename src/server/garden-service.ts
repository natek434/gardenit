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
  layout?: { positionX?: number | null; positionY?: number | null; spanWidth?: number | null; spanHeight?: number | null },
) {
  const planting = await prisma.planting.create({
    data: {
      bedId,
      plantId,
      startDate,
      quantity,
      notes,
      positionX: layout?.positionX ?? null,
      positionY: layout?.positionY ?? null,
      spanWidth: layout?.spanWidth ?? null,
      spanHeight: layout?.spanHeight ?? null,
    },
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

export function getGardensForUser(userId: string) {
  return prisma.garden.findMany({
    where: { userId },
    include: {
      beds: {
        include: {
          plantings: {
            include: {
              plant: {
                select: {
                  id: true,
                  commonName: true,
                  imageLocalPath: true,
                  defaultImage: true,
                  spacingInRowCm: true,
                  spacingBetweenRowsCm: true,
                },
              },
            },
            orderBy: { startDate: "desc" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export function createBed(gardenId: string, data: { name: string; widthCm: number; heightCm: number }) {
  return prisma.bed.create({
    data: {
      gardenId,
      name: data.name,
      widthCm: data.widthCm,
      heightCm: data.heightCm,
    },
  });
}

export function updatePlantingLayout(
  plantingId: string,
  layout: { positionX: number; positionY: number; spanWidth?: number | null; spanHeight?: number | null },
) {
  return prisma.planting.update({
    where: { id: plantingId },
    data: {
      positionX: layout.positionX,
      positionY: layout.positionY,
      spanWidth: layout.spanWidth ?? null,
      spanHeight: layout.spanHeight ?? null,
    },
  });
}

export async function deletePlanting(plantingId: string, userId: string) {
  const planting = await prisma.planting.findFirst({
    where: { id: plantingId, bed: { garden: { userId } } },
  });
  if (!planting) {
    return null;
  }
  await prisma.reminder.deleteMany({ where: { plantingId } });
  return prisma.planting.delete({ where: { id: plantingId } });
}

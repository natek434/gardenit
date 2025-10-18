import { prisma } from "@/src/lib/prisma";

export function getCollectionsForUser(userId: string) {
  return prisma.plantCollection.findMany({
    where: { userId },
    include: {
      plants: {
        include: {
          plant: {
            select: {
              id: true,
              commonName: true,
              imageLocalPath: true,
              defaultImage: true,
            },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function createCollection(userId: string, name: string) {
  return prisma.plantCollection.create({
    data: {
      userId,
      name,
    },
  });
}

export async function addPlantToCollection(collectionId: string, plantId: string, userId: string) {
  const collection = await prisma.plantCollection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  });
  if (!collection) {
    throw new Error("Collection not found");
  }
  return prisma.collectionPlant.upsert({
    where: { collectionId_plantId: { collectionId, plantId } },
    update: { addedAt: new Date() },
    create: { collectionId, plantId },
  });
}

export async function removePlantFromCollection(collectionId: string, plantId: string, userId: string) {
  const collection = await prisma.plantCollection.findFirst({
    where: { id: collectionId, userId },
    select: { id: true },
  });
  if (!collection) {
    throw new Error("Collection not found");
  }
  return prisma.collectionPlant.delete({
    where: { collectionId_plantId: { collectionId, plantId } },
  });
}

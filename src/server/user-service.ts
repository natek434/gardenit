import { prisma } from "@/src/lib/prisma";

export function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      locationLat: true,
      locationLon: true,
      climateZoneId: true,
      climateZone: {
        select: { id: true, name: true, country: true },
      },
    },
  });
}

export async function updateUserProfile(
  userId: string,
  data: { name?: string | null; climateZoneId?: string | null; locationLat?: number | null; locationLon?: number | null },
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      locationLat: true,
      locationLon: true,
      climateZoneId: true,
    },
  });
  return updated;
}

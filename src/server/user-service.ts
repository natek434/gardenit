import { prisma } from "@/src/lib/prisma";

export function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      locationName: true,
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
  data: {
    name?: string | null;
    climateZoneId?: string | null;
    locationName?: string | null;
    locationLat?: number | null;
    locationLon?: number | null;
  },
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      locationName: true,
      locationLat: true,
      locationLon: true,
      climateZoneId: true,
    },
  });
  return updated;
}

export async function changeUserPassword(userId: string, current: string, next: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hashedPassword: true },
  });

  if (!user?.hashedPassword) {
    throw new Error("Password reset is unavailable for this account");
  }

  const { compare, hash } = await import("bcryptjs");
  const matches = await compare(current, user.hashedPassword);
  if (!matches) {
    return { ok: false as const, error: "Current password is incorrect" };
  }

  const hashed = await hash(next, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { hashedPassword: hashed },
  });

  return { ok: true as const };
}

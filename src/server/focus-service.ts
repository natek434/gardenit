import { FocusKind } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export function getFocusItemsByUser(userId: string) {
  return prisma.focusItem.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function createFocusItem(
  userId: string,
  data: { kind: FocusKind; targetId: string; label?: string | null },
) {
  return prisma.focusItem.create({
    data: {
      userId,
      kind: data.kind,
      targetId: data.targetId,
      label: data.label?.trim() ? data.label.trim() : null,
    },
  });
}

export async function deleteFocusItem(id: string, userId: string) {
  const focus = await prisma.focusItem.findFirst({ where: { id, userId } });
  if (!focus) return null;
  await prisma.focusItem.delete({ where: { id } });
  return focus;
}

export async function upsertFocusItem(
  userId: string,
  data: { kind: FocusKind; targetId: string; label?: string | null },
) {
  const existing = await prisma.focusItem.findFirst({
    where: { userId, kind: data.kind, targetId: data.targetId },
  });
  if (existing) {
    if (data.label !== undefined) {
      return prisma.focusItem.update({
        where: { id: existing.id },
        data: { label: data.label?.trim() ? data.label.trim() : null },
      });
    }
    return existing;
  }
  return createFocusItem(userId, data);
}

import { NotificationRuleType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export function getNotificationRulesByUser(userId: string) {
  return prisma.notificationRule.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export function createNotificationRule(
  userId: string,
  data: {
    name: string;
    type: NotificationRuleType;
    schedule?: string | null;
    params: Record<string, unknown>;
    throttleSecs?: number;
    isEnabled?: boolean;
  },
) {
  return prisma.notificationRule.create({
    data: {
      userId,
      name: data.name,
      type: data.type,
      schedule: data.schedule ?? null,
      params: data.params,
      throttleSecs: data.throttleSecs ?? 21600,
      isEnabled: data.isEnabled ?? true,
    },
  });
}

export function updateNotificationRule(
  userId: string,
  ruleId: string,
  data: Partial<{
    name: string;
    schedule: string | null;
    params: Record<string, unknown>;
    throttleSecs: number;
    isEnabled: boolean;
    type: NotificationRuleType;
  }>,
) {
  return prisma.notificationRule.update({
    where: { id: ruleId, userId },
    data,
  });
}

export async function deleteNotificationRule(userId: string, ruleId: string) {
  const existing = await prisma.notificationRule.findFirst({ where: { id: ruleId, userId } });
  if (!existing) return null;
  await prisma.notification.deleteMany({ where: { ruleId } });
  await prisma.notificationRule.delete({ where: { id: ruleId } });
  return existing;
}

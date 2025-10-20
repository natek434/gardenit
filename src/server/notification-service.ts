import { NotificationChannel, NotificationSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export function getNotificationsByUser(userId: string) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { dueAt: "desc" },
  });
}

export async function recordNotification(
  userId: string,
  data: {
    ruleId?: string | null;
    title: string;
    body: string;
    severity: NotificationSeverity;
    channel: NotificationChannel;
    dueAt: Date;
    meta?: Prisma.InputJsonValue;
  },
) {
  return prisma.notification.create({
    data: {
      userId,
      ruleId: data.ruleId ?? null,
      title: data.title,
      body: data.body,
      severity: data.severity,
      channel: data.channel,
      dueAt: data.dueAt,
      meta: data.meta ?? Prisma.JsonNull,
    },
  });
}

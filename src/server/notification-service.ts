import { NotificationChannel, NotificationSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export function getNotificationsByUser(userId: string) {
  return prisma.notification.findMany({
    where: { userId, clearedAt: null },
    orderBy: { dueAt: "desc" },
    include: {
      rule: { select: { id: true, name: true } },
    },
  });
}

export function getRecentNotifications(userId: string, take = 25) {
  return prisma.notification.findMany({
    where: { userId, clearedAt: null },
    orderBy: { dueAt: "desc" },
    take,
  });
}

export async function getNotificationSummary(userId: string, take = 5) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, clearedAt: null },
      orderBy: { dueAt: "desc" },
      take,
      include: {
        rule: { select: { id: true, name: true } },
      },
    }),
    prisma.notification.count({ where: { userId, clearedAt: null, readAt: null } }),
  ]);
  return { notifications, unreadCount };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) {
    return null;
  }
  if (notification.readAt) {
    return notification;
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    include: {
      rule: { select: { id: true, name: true } },
    },
  });
}

export async function clearNotification(userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) {
    return null;
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { clearedAt: new Date(), readAt: notification.readAt ?? new Date() },
  });
}

export function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, clearedAt: null, readAt: null },
    data: { readAt: new Date() },
  });
}

export function clearAllNotifications(userId: string) {
  const now = new Date();
  return prisma.notification.updateMany({
    where: { userId, clearedAt: null },
    data: { clearedAt: now, readAt: now },
  });
}

export function getRecentNotifications(userId: string, take = 25) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { dueAt: "desc" },
    take,
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

import { prisma } from "@/src/lib/prisma";

export function getRemindersByUser(userId: string) {
  return prisma.reminder.findMany({
    where: { userId },
    orderBy: { dueAt: "asc" },
  });
}

export function createReminder(data: { userId: string; title: string; dueAt: Date; cadence?: string; type: string }) {
  return prisma.reminder.create({ data });
}

import cron from "node-cron";
import { prisma } from "../lib/prisma";

const DAILY_SCHEDULE = "0 7 * * *"; // 07:00 daily

export function startScheduler() {
  if (process.env.NODE_ENV === "test") return;
  cron.schedule(DAILY_SCHEDULE, async () => {
    await processDueReminders();
  });
}

export async function processDueReminders(reference = new Date()) {
  const reminders = await prisma.reminder.findMany({
    where: {
      dueAt: { lte: reference },
      sentAt: null,
    },
    include: {
      user: true,
      planting: {
        include: {
          plant: true,
        },
      },
    },
  });

  for (const reminder of reminders) {
    console.log(
      `[Gardenit] Reminder for ${reminder.user.email}: ${reminder.title} (${reminder.type}) due ${reminder.dueAt.toISOString()}`,
    );
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { sentAt: reference },
    });
  }
}

export async function scheduleCareReminders(plantingId: string) {
  const planting = await prisma.planting.findUnique({
    where: { id: plantingId },
    include: { plant: true, bed: { include: { garden: { include: { user: true } } } } },
  });
  if (!planting) return;

  const now = new Date();
  const reminders = [
    {
      title: `Water ${planting.plant.commonName}`,
      dueAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3),
      cadence: "every 3 days",
      type: "watering",
    },
    {
      title: `Feed ${planting.plant.commonName}`,
      dueAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14),
      cadence: "every 14 days",
      type: "feeding",
    },
    {
      title: `Check harvest readiness for ${planting.plant.commonName}`,
      dueAt: new Date(planting.startDate.getTime() + (planting.plant.daysToMaturity ?? 60) * 24 * 60 * 60 * 1000),
      cadence: null,
      type: "harvest",
    },
  ];

  await prisma.reminder.createMany({
    data: reminders.map((reminder) => ({
      ...reminder,
      userId: planting.bed.garden.userId,
      plantingId: planting.id,
    })),
  });
}

startScheduler();

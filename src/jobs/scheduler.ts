import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/email";

const DAILY_SCHEDULE = "0 7 * * *"; // 07:00 daily
const DAY_IN_MS = 1000 * 60 * 60 * 24;
const WEATHER_THRESHOLD_MM = Number(process.env.WEATHER_WATERING_THRESHOLD_MM ?? 2);

export function startScheduler() {
  if (process.env.NODE_ENV === "test") return;
  cron.schedule(DAILY_SCHEDULE, async () => {
    await processDueReminders();
    await runDailyWeatherCheck();
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
    const detailLines: string[] = [];
    if (reminder.planting?.plant) {
      detailLines.push(`Plant: ${reminder.planting.plant.commonName}`);
    }
    if (reminder.details) {
      detailLines.push(reminder.details);
    }
    const textBody = [
      `${reminder.title} is due ${reminder.dueAt.toLocaleString()}.`,
      ...detailLines,
      "Visit Gardenit to log progress or adjust reminders.",
    ].join("\n\n");

    await sendEmail({
      to: reminder.user.email,
      subject: `[Gardenit] ${reminder.title}`,
      text: textBody,
    });
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
      details: `Keep soil evenly moist around ${planting.plant.commonName}. Adjust if rainfall is expected.`,
    },
    {
      title: `Feed ${planting.plant.commonName}`,
      dueAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14),
      cadence: "every 14 days",
      type: "feeding",
      details: `Provide a balanced feed to ${planting.plant.commonName} to support growth.`,
    },
    {
      title: `Check harvest readiness for ${planting.plant.commonName}`,
      dueAt: new Date(planting.startDate.getTime() + (planting.plant.daysToMaturity ?? 60) * DAY_IN_MS),
      cadence: null,
      type: "harvest",
      details: `Based on ${planting.plant.commonName}'s maturity window. Inspect fruit or foliage for readiness.`,
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

export async function runDailyWeatherCheck(reference = new Date()) {
  const users = await prisma.user.findMany({
    where: { NOT: { locationLat: null }, locationLon: { not: null }, email: { not: null } },
    select: { id: true, email: true, locationLat: true, locationLon: true, name: true },
  });

  const startOfDay = new Date(reference);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + DAY_IN_MS);

  for (const user of users) {
    if (user.locationLat === null || user.locationLon === null) continue;
    try {
      const precipitation = await fetchDailyPrecipitation(user.locationLat, user.locationLon);
      const needsWater = precipitation < WEATHER_THRESHOLD_MM;
      const title = needsWater ? "Water your garden today" : "Rainfall will cover watering";
      const detail = needsWater
        ? `Only ${precipitation.toFixed(1)}mm of rain is forecast, so plan to water.`
        : `Around ${precipitation.toFixed(1)}mm of rain is on the way. You can skip watering today.`;
      const textBody = [`Hi ${user.name ?? "gardener"},`, detail, "Log in to Gardenit for more context."].join("\n\n");

      await sendEmail({
        to: user.email!,
        subject: `[Gardenit] ${title}`,
        text: textBody,
      });

      const existing = await prisma.reminder.findFirst({
        where: {
          userId: user.id,
          type: "weather-watering",
          dueAt: { gte: startOfDay, lt: endOfDay },
        },
      });

      if (existing) {
        await prisma.reminder.update({
          where: { id: existing.id },
          data: { title, details: detail, dueAt: reference, sentAt: reference },
        });
      } else {
        await prisma.reminder.create({
          data: {
            userId: user.id,
            title,
            details: detail,
            dueAt: reference,
            cadence: "daily",
            type: "weather-watering",
            sentAt: reference,
          },
        });
      }
    } catch (error) {
      console.error("[Gardenit] Weather check failed", error);
    }
  }
}

async function fetchDailyPrecipitation(latitude: number, longitude: number): Promise<number> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.status}`);
  }
  const data = (await response.json()) as { daily?: { precipitation_sum?: number[] } };
  return data.daily?.precipitation_sum?.[0] ?? 0;
}

startScheduler();

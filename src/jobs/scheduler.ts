import cron from "node-cron";
import { prisma } from "../lib/prisma";
import { sendEmail } from "../lib/email";

const FIFTEEN_MINUTE_CRON = "*/15 * * * *";
const DAY_IN_MS = 1000 * 60 * 60 * 24;
const HOUR_IN_MS = 1000 * 60 * 60;

type BuiltInRule = {
  name: string;
  type: "time" | "weather" | "soil" | "phenology" | "garden";
  schedule?: string;
  params: Record<string, unknown>;
  throttleSecs?: number;
};

const BUILT_IN_RULES: BuiltInRule[] = [
  {
    name: "time_morning_digest",
    type: "time",
    schedule: "FREQ=DAILY;BYHOUR=7;BYMINUTE=10",
    params: { actions: [{ do: "digest", channel: "email" }] },
    throttleSecs: 60 * 60 * 20,
  },
  {
    name: "time_weekly_check",
    type: "time",
    schedule: "FREQ=WEEKLY;BYDAY=SU;BYHOUR=16;BYMINUTE=0",
    params: {
      actions: [
        {
          do: "notify",
          title: "Weekly garden walkthrough",
          body:
            "Weeding, deadheading, pest checks, tying supports, and succession sowing keep the garden thriving.",
          severity: "info",
          channel: "inapp",
        },
      ],
    },
    throttleSecs: 60 * 60 * 12,
  },
  {
    name: "weather_rain_skip",
    type: "weather",
    params: {
      precipProbNext24hGte: 0.6,
      actions: [
        { do: "suppress_tasks", where: { type: "watering", dueWithinHours: 18 } },
        {
          do: "notify",
          title: "Rain coming — skip watering",
          body: "Precipitation is likely in the next 24 hours. We'll pause watering reminders for the next 18 hours.",
          severity: "info",
          channel: "email",
        },
      ],
    },
    throttleSecs: 60 * 60 * 12,
  },
  {
    name: "weather_frost_risk",
    type: "weather",
    params: {
      frostProbGte: 0.3,
      minTempLte: 0,
      actions: [
        {
          do: "notify",
          title: "Frost risk — protect tender plants",
          body: "Cover focus plantings and sensitive crops overnight to prevent damage.",
          severity: "critical",
          channel: "push",
        },
      ],
    },
    throttleSecs: 60 * 60 * 6,
  },
  {
    name: "weather_heat_spike",
    type: "weather",
    params: {
      maxTempTomorrowGte: 28,
      actions: [
        {
          do: "notify",
          title: "Heat spike incoming",
          body: "Plan early watering and shade cloth for leafy greens before temperatures climb tomorrow.",
          severity: "warning",
          channel: "inapp",
        },
      ],
    },
    throttleSecs: 60 * 60 * 12,
  },
  {
    name: "soil_temp_threshold",
    type: "soil",
    params: {
      soilTemp10cmGte: 12,
      species: ["beans", "maize", "cucumber"],
      actions: [
        {
          do: "notify",
          title: "Soil warm enough to sow",
          body: "Soil temps at 10cm depth suit beans, maize, and cucumbers — direct sow when beds are ready.",
          severity: "info",
          channel: "inapp",
        },
      ],
    },
    throttleSecs: 60 * 60 * 24,
  },
  {
    name: "phenology_gdd_harvest",
    type: "phenology",
    params: {
      maturityGDDPctGte: 0.8,
      actions: [
        {
          do: "notify",
          title: "Plantings nearing harvest window",
          body: "Several crops are approaching harvest. Inspect beds and pick at peak flavor.",
          severity: "info",
          channel: "email",
        },
      ],
    },
    throttleSecs: 60 * 60 * 12,
  },
  {
    name: "weather_wind_advisory",
    type: "weather",
    params: {
      gustsNext24hGte: 60,
      actions: [
        {
          do: "notify",
          title: "Secure trellises and hoops",
          body: "High winds are forecast — stake tomatoes and tie down floating row covers.",
          severity: "warning",
          channel: "push",
        },
      ],
    },
    throttleSecs: 60 * 60 * 12,
  },
  {
    name: "garden_focus_escalation",
    type: "garden",
    params: {
      focusOnly: true,
      overdueTaskHoursGte: 48,
      actions: [
        {
          do: "notify",
          title: "Focus tasks overdue",
          body: "Important focus tasks are overdue. Review them to keep priorities moving.",
          severity: "warning",
          channel: "inapp",
        },
      ],
    },
    throttleSecs: 60 * 60 * 6,
  },
];

export function startScheduler() {
  if (process.env.NODE_ENV === "test") return;
  cron.schedule(FIFTEEN_MINUTE_CRON, async () => {
    const now = new Date();
    await processDueReminders(now);
    await evaluateNotificationRules(now);
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

type WeatherSnapshot = {
  timezone: string;
  precipProbNext24h: number;
  minTempNext24h: number | null;
  maxTempTomorrow: number | null;
  frostProbability: number;
  gustsNext24h: number | null;
  soilTemp10cm: number | null;
};

type UserRuleContext = {
  weather?: WeatherSnapshot;
  focusItems: Awaited<ReturnType<typeof prisma.focusItem.findMany>>;
  reminders: Awaited<ReturnType<typeof prisma.reminder.findMany>>;
  plantings: Array<
    Awaited<ReturnType<typeof prisma.planting.findMany>>[number] & {
      plant: { id: string; commonName: string; daysToMaturity: number | null; category: string | null };
      bed: { id: string; name: string; garden: { id: string; name: string } };
    }
  >;
  plantsById: Map<string, { id: string; commonName: string }>;
};

export async function evaluateNotificationRules(reference = new Date()) {
  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      email: true,
      name: true,
      locationLat: true,
      locationLon: true,
    },
  });

  for (const user of users) {
    await ensureBuiltInRules(user.id);
    const [rules, focusItems, reminders, plantings] = await Promise.all([
      prisma.notificationRule.findMany({ where: { userId: user.id, isEnabled: true } }),
      prisma.focusItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.reminder.findMany({ where: { userId: user.id } }),
      prisma.planting.findMany({
        where: { bed: { garden: { userId: user.id } } },
        include: {
          plant: { select: { id: true, commonName: true, daysToMaturity: true, category: true } },
          bed: {
            select: {
              id: true,
              name: true,
              garden: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    let weather: WeatherSnapshot | undefined;
    if (user.locationLat !== null && user.locationLon !== null) {
      try {
        weather = await fetchWeatherSnapshot(user.locationLat, user.locationLon);
      } catch (error) {
        console.error("[Gardenit] Weather snapshot failed", error);
      }
    }

    const plantIds = focusItems.filter((item) => item.kind === "plant").map((item) => item.targetId);
    const plants = plantIds.length
      ? await prisma.plant.findMany({ where: { id: { in: plantIds } }, select: { id: true, commonName: true } })
      : [];
    const context: UserRuleContext = {
      weather,
      focusItems,
      reminders,
      plantings: plantings as UserRuleContext["plantings"],
      plantsById: new Map(plants.map((plant) => [plant.id, plant])),
    };

    for (const rule of rules) {
      try {
        await evaluateRuleForUser(reference, user, rule, context);
      } catch (error) {
        console.error(`[Gardenit] Rule ${rule.name} failed`, error);
      }
    }
  }
}

async function ensureBuiltInRules(userId: string) {
  const existing = await prisma.notificationRule.findMany({ where: { userId } });
  const byName = new Map(existing.map((rule) => [rule.name, rule]));
  for (const rule of BUILT_IN_RULES) {
    if (byName.has(rule.name)) continue;
    await prisma.notificationRule.create({
      data: {
        userId,
        name: rule.name,
        type: rule.type,
        schedule: rule.schedule ?? null,
        params: rule.params,
        throttleSecs: rule.throttleSecs ?? 21600,
      },
    });
  }
}

async function evaluateRuleForUser(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: {
    id: string;
    name: string;
    type: string;
    schedule: string | null;
    params: Record<string, unknown>;
    throttleSecs: number;
  },
  context: UserRuleContext,
) {
  switch (rule.type) {
    case "time":
      await evaluateTimeRule(reference, user, rule, context);
      break;
    case "weather":
      await evaluateWeatherRule(reference, user, rule, context);
      break;
    case "soil":
      await evaluateSoilRule(reference, user, rule, context);
      break;
    case "phenology":
      await evaluatePhenologyRule(reference, user, rule, context);
      break;
    case "garden":
      await evaluateGardenRule(reference, user, rule, context);
      break;
    default:
      break;
  }
}

async function evaluateTimeRule(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: { id: string; schedule: string | null; params: Record<string, unknown>; throttleSecs: number },
  context: UserRuleContext,
) {
  if (!rule.schedule) return;
  const weatherTz = context.weather?.timezone ?? "UTC";
  const localNow = zonedDate(reference, weatherTz);
  if (!matchesSchedule(localNow, rule.schedule)) {
    return;
  }

  const actions = Array.isArray((rule.params as { actions?: unknown }).actions)
    ? ((rule.params as { actions?: unknown }).actions as Array<Record<string, unknown>>)
    : [];

  for (const action of actions) {
    if (action.do === "digest") {
      await dispatchDigest(reference, user, rule, context);
    }
    if (action.do === "notify") {
      await dispatchNotification(reference, user, rule, {
        title: String(action.title ?? "Reminder"),
        body: String(action.body ?? ""),
        severity: (action.severity as "info" | "warning" | "critical") ?? "info",
        channel: (action.channel as "email" | "inapp" | "push") ?? "inapp",
        meta: { action },
      });
    }
  }
}

async function dispatchDigest(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: { id: string; throttleSecs: number },
  context: UserRuleContext,
) {
  if (!user.email) return;
  const since = new Date(reference.getTime() - rule.throttleSecs * 1000);
  const existing = await prisma.notification.findFirst({
    where: { userId: user.id, ruleId: rule.id, dueAt: { gte: since } },
  });
  if (existing) return;

  const focusLines = buildFocusDigest(context);
  const todayTasks = context.reminders
    .filter((reminder) => reminder.dueAt <= new Date(reference.getTime() + DAY_IN_MS))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .map((reminder) => `• ${reminder.title} — due ${reminder.dueAt.toLocaleString()}`);

  const bodyLines = [
    focusLines.length ? "Focus priorities:" : null,
    ...focusLines,
    todayTasks.length ? "\nToday\'s tasks:" : null,
    ...todayTasks,
  ].filter(Boolean) as string[];

  const emailBody = bodyLines.join("\n");

  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      ruleId: rule.id,
      title: "Morning garden digest",
      body: emailBody,
      severity: "info",
      channel: "email",
      dueAt: reference,
      meta: { focus: context.focusItems.map((item) => item.targetId) },
    },
  });

  await sendEmail({
    to: user.email,
    subject: "[Gardenit] Morning digest",
    text: emailBody || "No tasks today — enjoy the garden!",
  });

  return notification;
}

async function evaluateWeatherRule(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: { id: string; params: Record<string, unknown>; throttleSecs: number },
  context: UserRuleContext,
) {
  if (!context.weather) return;
  const params = rule.params as Record<string, unknown>;
  if (typeof params.precipProbNext24hGte === "number") {
    if (context.weather.precipProbNext24h >= params.precipProbNext24hGte) {
      await handleWeatherActions(reference, user, rule, context, params.actions);
      return;
    }
  }
  if (typeof params.frostProbGte === "number" || typeof params.minTempLte === "number") {
    const frostOk =
      (typeof params.frostProbGte !== "number" || context.weather.frostProbability >= params.frostProbGte) &&
      (typeof params.minTempLte !== "number" ||
        (context.weather.minTempNext24h ?? Number.POSITIVE_INFINITY) <= params.minTempLte);
    if (frostOk) {
      await handleWeatherActions(reference, user, rule, context, params.actions, {
        focusOnly: true,
      });
      return;
    }
  }
  if (typeof params.maxTempTomorrowGte === "number") {
    if ((context.weather.maxTempTomorrow ?? -Infinity) >= params.maxTempTomorrowGte) {
      await handleWeatherActions(reference, user, rule, context, params.actions);
      return;
    }
  }
  if (typeof params.gustsNext24hGte === "number") {
    if ((context.weather.gustsNext24h ?? 0) >= params.gustsNext24hGte) {
      await handleWeatherActions(reference, user, rule, context, params.actions, { focusOnly: true });
    }
  }
}

async function handleWeatherActions(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: { id: string; throttleSecs: number },
  context: UserRuleContext,
  actions: unknown,
  options: { focusOnly?: boolean } = {},
) {
  if (!Array.isArray(actions)) return;
  for (const action of actions) {
    if (typeof action !== "object" || !action) continue;
    const typed = action as Record<string, unknown>;
    if (typed.do === "suppress_tasks" && typed.where && typeof typed.where === "object") {
      const where = typed.where as { type?: string; dueWithinHours?: number };
      const dueWithin = typeof where.dueWithinHours === "number" ? where.dueWithinHours : 18;
      await prisma.reminder.updateMany({
        where: {
          userId: user.id,
          type: where.type ?? "watering",
          dueAt: {
            gte: reference,
            lte: new Date(reference.getTime() + dueWithin * HOUR_IN_MS),
          },
        },
        data: {
          dueAt: new Date(reference.getTime() + (dueWithin + 24) * HOUR_IN_MS),
          details: "Suppressed due to upcoming weather; we'll remind you after conditions improve.",
        },
      });
    }
    if (typed.do === "notify") {
      await dispatchNotification(reference, user, rule, {
        title: String(typed.title ?? "Weather alert"),
        body: String(typed.body ?? ""),
        severity: (typed.severity as "info" | "warning" | "critical") ?? "info",
        channel: (typed.channel as "inapp" | "email" | "push") ?? "inapp",
        meta: { focusOnly: options.focusOnly ?? false },
      });
    }
  }
}

async function evaluateSoilRule(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: { id: string; params: Record<string, unknown>; throttleSecs: number },
  context: UserRuleContext,
) {
  if (!context.weather?.soilTemp10cm) return;
  const params = rule.params as Record<string, unknown>;
  if (typeof params.soilTemp10cmGte === "number" && context.weather.soilTemp10cm >= params.soilTemp10cmGte) {
    const species = Array.isArray(params.species)
      ? (params.species as string[]).map((item) => item.toLowerCase())
      : [];
    const relevantPlantings = context.plantings.filter((planting) =>
      species.some((spec) => planting.plant.commonName.toLowerCase().includes(spec)),
    );
    if (!relevantPlantings.length) return;
    await dispatchNotification(reference, user, rule, {
      title: "Warm enough to sow beans",
      body: `Soil is ${context.weather.soilTemp10cm.toFixed(1)}°C — ideal for ${relevantPlantings
        .map((planting) => planting.plant.commonName)
        .join(", ")}.`,
      severity: "info",
      channel: "inapp",
      meta: { plantings: relevantPlantings.map((planting) => planting.id) },
    });
  }
}

async function evaluatePhenologyRule(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: { id: string; params: Record<string, unknown>; throttleSecs: number },
  context: UserRuleContext,
) {
  const params = rule.params as Record<string, unknown>;
  const threshold = typeof params.maturityGDDPctGte === "number" ? params.maturityGDDPctGte : 0.8;
  const nearing = context.plantings.filter((planting) => {
    if (!planting.plant.daysToMaturity) return false;
    const daysSinceStart = (reference.getTime() - planting.startDate.getTime()) / DAY_IN_MS;
    const ratio = planting.plant.daysToMaturity ? daysSinceStart / planting.plant.daysToMaturity : 0;
    return ratio >= threshold;
  });
  if (!nearing.length) return;
  await dispatchNotification(reference, user, rule, {
    title: "Carrots nearing harvest window",
    body: `Check ${nearing.map((planting) => planting.plant.commonName).join(", ")} for harvest readiness.`,
    severity: "info",
    channel: "email",
    meta: { plantings: nearing.map((planting) => planting.id) },
  });
}

async function evaluateGardenRule(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: { id: string; params: Record<string, unknown>; throttleSecs: number },
  context: UserRuleContext,
) {
  const params = rule.params as Record<string, unknown>;
  const overdueHours = typeof params.overdueTaskHoursGte === "number" ? params.overdueTaskHoursGte : 48;
  const focusOnly = Boolean(params.focusOnly);
  const overdue = context.reminders.filter((reminder) => {
    if (reminder.sentAt && reminder.sentAt > reminder.dueAt) return false;
    const overdueFor = (reference.getTime() - reminder.dueAt.getTime()) / HOUR_IN_MS;
    if (overdueFor < overdueHours) return false;
    if (!focusOnly) return true;
    return context.focusItems.some((item) => item.kind === "task" && item.targetId === reminder.id);
  });
  if (!overdue.length) return;
  await dispatchNotification(reference, user, rule, {
    title: "Focus tasks overdue",
    body: overdue.map((reminder) => `• ${reminder.title} (${reminder.dueAt.toLocaleString()})`).join("\n"),
    severity: "warning",
    channel: "inapp",
    meta: { reminders: overdue.map((reminder) => reminder.id) },
  });
}

async function dispatchNotification(
  reference: Date,
  user: { id: string; email: string | null; name: string | null },
  rule: { id: string; throttleSecs: number },
  payload: {
    title: string;
    body: string;
    severity: "info" | "warning" | "critical";
    channel: "inapp" | "email" | "push";
    meta?: Record<string, unknown>;
  },
) {
  const since = new Date(reference.getTime() - rule.throttleSecs * 1000);
  const existing = await prisma.notification.findFirst({
    where: { userId: user.id, ruleId: rule.id, dueAt: { gte: since } },
  });
  if (existing) return existing;
  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      ruleId: rule.id,
      title: payload.title,
      body: payload.body,
      severity: payload.severity,
      channel: payload.channel,
      dueAt: reference,
      meta: payload.meta ?? null,
    },
  });
  if (payload.channel === "email" && user.email) {
    await sendEmail({ to: user.email, subject: `[Gardenit] ${payload.title}`, text: payload.body });
  }
  if (payload.channel === "push" && user.email) {
    await sendEmail({ to: user.email, subject: `[Gardenit] ${payload.title}`, text: payload.body });
  }
  return notification;
}

export function buildFocusDigest(context: UserRuleContext) {
  const lines: string[] = [];
  for (const item of context.focusItems) {
    if (item.kind === "planting") {
      const planting = context.plantings.find((candidate) => candidate.id === item.targetId);
      if (!planting) continue;
      lines.push(
        `• ${planting.plant.commonName} in ${planting.bed.name} (${planting.bed.garden.name}) — planted ${planting.startDate.toLocaleDateString()}`,
      );
    } else if (item.kind === "bed") {
      const bed = context.plantings.find((planting) => planting.bed.id === item.targetId)?.bed;
      if (!bed) continue;
      lines.push(`• Bed ${bed.name} (${bed.garden.name})`);
    } else if (item.kind === "plant") {
      const plant = context.plantsById.get(item.targetId);
      if (!plant) continue;
      lines.push(`• ${plant.commonName}`);
    } else if (item.kind === "task") {
      const reminder = context.reminders.find((candidate) => candidate.id === item.targetId);
      if (!reminder) continue;
      lines.push(`• ${reminder.title} — due ${reminder.dueAt.toLocaleString()}`);
    }
  }
  return lines;
}

type ZonedDate = { year: number; month: number; day: number; hour: number; minute: number; weekday: string };

function zonedDate(reference: Date, timeZone: string): ZonedDate {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = formatter.formatToParts(reference);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    weekday: lookup.weekday,
  };
}

export function matchesSchedule(localNow: ZonedDate, schedule: string) {
  const segments = schedule.split(";");
  const map = new Map<string, string>();
  for (const segment of segments) {
    const [key, value] = segment.split("=");
    if (key && value) map.set(key.toUpperCase(), value.toUpperCase());
  }
  const freq = map.get("FREQ");
  const hour = map.has("BYHOUR") ? Number(map.get("BYHOUR")) : undefined;
  const minute = map.has("BYMINUTE") ? Number(map.get("BYMINUTE")) : 0;
  if (hour !== undefined && localNow.hour !== hour) return false;
  if (minute !== undefined) {
    const diff = Math.abs(localNow.minute - minute);
    if (diff > 7) return false;
  }
  if (freq === "DAILY") return true;
  if (freq === "WEEKLY") {
    const byDay = map.get("BYDAY");
    if (!byDay) return true;
    return byDay.split(",").some((day) => day.trim().toUpperCase().startsWith(localNow.weekday.slice(0, 2).toUpperCase()));
  }
  return false;
}

async function fetchWeatherSnapshot(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude.toString());
  url.searchParams.set("longitude", longitude.toString());
  url.searchParams.set(
    "hourly",
    "precipitation_probability,temperature_2m,soil_temperature_10cm,wind_gusts_10m",
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_gusts_10m_max",
  );
  url.searchParams.set("forecast_days", "2");
  url.searchParams.set("timezone", "auto");
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch weather: ${response.status}`);
  }
  const data = (await response.json()) as {
    timezone: string;
    hourly?: {
      precipitation_probability?: number[];
      wind_gusts_10m?: number[];
      soil_temperature_10cm?: number[];
      time?: string[];
    };
    daily?: {
      temperature_2m_min?: number[];
      temperature_2m_max?: number[];
      precipitation_probability_max?: number[];
      wind_gusts_10m_max?: number[];
    };
  };
  const precipProbNext24h = Math.max(
    ...(data.hourly?.precipitation_probability?.slice(0, 24) ?? [0]),
  ) / 100;
  const gustsNext24h = Math.max(...(data.hourly?.wind_gusts_10m?.slice(0, 24) ?? [0]));
  const soilTemps = data.hourly?.soil_temperature_10cm?.slice(0, 24) ?? [];
  const soilTemp10cm = soilTemps.length
    ? soilTemps.reduce((sum, value) => sum + value, 0) / soilTemps.length
    : null;
  const minTempNext24h = data.daily?.temperature_2m_min?.[0] ?? null;
  const frostProbability = minTempNext24h !== null && minTempNext24h <= 0 ? 0.5 : precipProbNext24h;
  const maxTempTomorrow = data.daily?.temperature_2m_max?.[1] ?? data.daily?.temperature_2m_max?.[0] ?? null;
  return {
    timezone: data.timezone ?? "UTC",
    precipProbNext24h,
    minTempNext24h,
    maxTempTomorrow,
    frostProbability,
    gustsNext24h: Number.isFinite(gustsNext24h) ? gustsNext24h : null,
    soilTemp10cm,
  };
}

startScheduler();

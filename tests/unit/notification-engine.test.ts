import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { evaluateNotificationRules } from "@/src/jobs/scheduler";

const mocks = vi.hoisted(() => ({
  notificationCreate: vi.fn(),
  userFindMany: vi.fn(),
  notificationRuleFindMany: vi.fn(),
  notificationRuleCreate: vi.fn(),
  focusFindMany: vi.fn(),
  reminderFindMany: vi.fn(),
  reminderUpdateMany: vi.fn(),
  plantingFindMany: vi.fn(),
  plantFindMany: vi.fn(),
  notificationFindFirst: vi.fn(),
  sendEmail: vi.fn(),
}));

const notificationCreate = mocks.notificationCreate;
const notificationFindFirst = mocks.notificationFindFirst;
const userFindMany = mocks.userFindMany;
const notificationRuleFindMany = mocks.notificationRuleFindMany;
const notificationRuleCreate = mocks.notificationRuleCreate;
const focusFindMany = mocks.focusFindMany;
const reminderFindMany = mocks.reminderFindMany;
const reminderUpdateMany = mocks.reminderUpdateMany;
const plantingFindMany = mocks.plantingFindMany;
const plantFindMany = mocks.plantFindMany;
const sendEmail = mocks.sendEmail;

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    user: { findMany: mocks.userFindMany },
    notificationRule: { findMany: mocks.notificationRuleFindMany, create: mocks.notificationRuleCreate },
    focusItem: { findMany: mocks.focusFindMany },
    reminder: { findMany: mocks.reminderFindMany, updateMany: mocks.reminderUpdateMany },
    planting: { findMany: mocks.plantingFindMany },
    plant: { findMany: mocks.plantFindMany },
    notification: { create: mocks.notificationCreate, findFirst: mocks.notificationFindFirst },
  },
}));

vi.mock("@/src/lib/email", () => ({ sendEmail: mocks.sendEmail }));

const builtInNames = [
  "time_morning_digest",
  "time_weekly_check",
  "weather_rain_skip",
  "weather_frost_risk",
  "weather_heat_spike",
  "soil_temp_threshold",
  "phenology_gdd_harvest",
  "weather_wind_advisory",
  "garden_focus_escalation",
];

beforeEach(() => {
  vi.useFakeTimers();
  notificationCreate.mockReset();
  userFindMany.mockReset();
  notificationRuleFindMany.mockReset();
  notificationRuleCreate.mockReset();
  focusFindMany.mockReset();
  reminderFindMany.mockReset();
  reminderUpdateMany.mockReset();
  plantingFindMany.mockReset();
  plantFindMany.mockReset();
  notificationFindFirst.mockReset();
  sendEmail.mockReset();
  notificationFindFirst.mockResolvedValue(null);
  sendEmail.mockResolvedValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("weather-driven notifications", () => {
  test("rain skip rule suppresses watering reminders and sends notification", async () => {
    userFindMany.mockResolvedValueOnce([
      { id: "user-1", email: "test@example.com", name: "Tester", locationLat: 1, locationLon: 1 },
    ]);
    notificationRuleFindMany
      .mockResolvedValueOnce(builtInNames.map((name, index) => ({ id: `rule-${index}`, name })))
      .mockResolvedValueOnce([
        {
          id: "rain-rule",
          name: "weather_rain_skip",
          type: "weather",
          schedule: null,
          params: {
            precipProbNext24hGte: 0.6,
            actions: [
              { do: "suppress_tasks", where: { type: "watering", dueWithinHours: 18 } },
              {
                do: "notify",
                title: "Rain coming — skip watering",
                body: "Rain incoming",
                severity: "info",
                channel: "email",
              },
            ],
          },
          throttleSecs: 3600,
        },
      ]);
    focusFindMany.mockResolvedValue([]);
    reminderFindMany.mockResolvedValue([
      {
        id: "reminder-1",
        userId: "user-1",
        plantingId: null,
        title: "Water",
        dueAt: new Date(),
        cadence: null,
        type: "watering",
        sentAt: null,
        details: null,
      },
    ]);
    plantingFindMany.mockResolvedValue([]);
    plantFindMany.mockResolvedValue([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timezone: "UTC",
          hourly: { precipitation_probability: Array(24).fill(80) },
          daily: { temperature_2m_min: [10], temperature_2m_max: [20], precipitation_probability_max: [80], wind_gusts_10m_max: [20] },
        }),
      }) as unknown as typeof fetch,
    );

    await evaluateNotificationRules(new Date());

    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          title: expect.stringContaining("Rain coming"),
          channel: "email",
        }),
      }),
    );
    expect(reminderUpdateMany).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
  });

  test("frost risk escalates severity and sends push notification", async () => {
    userFindMany.mockResolvedValueOnce([
      { id: "user-1", email: "test@example.com", name: "Tester", locationLat: 1, locationLon: 1 },
    ]);
    notificationRuleFindMany
      .mockResolvedValueOnce(builtInNames.map((name, index) => ({ id: `rule-${index}`, name })))
      .mockResolvedValueOnce([
        {
          id: "frost-rule",
          name: "weather_frost_risk",
          type: "weather",
          schedule: null,
          params: {
            frostProbGte: 0.3,
            minTempLte: 0,
            actions: [
              {
                do: "notify",
                title: "Frost risk",
                body: "Protect plants",
                severity: "critical",
                channel: "push",
              },
            ],
          },
          throttleSecs: 3600,
        },
      ]);
    focusFindMany.mockResolvedValue([
      { id: "focus-planting", userId: "user-1", kind: "planting", targetId: "planting-1", label: null, createdAt: new Date() },
    ]);
    reminderFindMany.mockResolvedValue([]);
    plantingFindMany.mockResolvedValue([]);
    plantFindMany.mockResolvedValue([]);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timezone: "UTC",
          hourly: { precipitation_probability: Array(24).fill(20) },
          daily: { temperature_2m_min: [-1], temperature_2m_max: [5], precipitation_probability_max: [20], wind_gusts_10m_max: [15] },
        }),
      }) as unknown as typeof fetch,
    );

    await evaluateNotificationRules(new Date());

    expect(notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          severity: "critical",
          channel: "push",
        }),
      }),
    );
    expect(sendEmail).toHaveBeenCalled();
  });
});

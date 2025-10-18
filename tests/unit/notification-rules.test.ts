import { describe, expect, test, vi } from "vitest";
import { buildFocusDigest, matchesSchedule } from "@/src/jobs/scheduler";

vi.mock("@/src/lib/email", () => ({ sendEmail: vi.fn() }));

const baseContext = {
  weather: undefined,
  reminders: [
    {
      id: "reminder-1",
      userId: "user",
      plantingId: null,
      title: "Water tomatoes",
      dueAt: new Date("2024-05-01T07:00:00Z"),
      cadence: null,
      type: "watering",
      sentAt: null,
      details: null,
    },
  ],
  plantings: [
    {
      id: "planting-1",
      plantId: "plant-1",
      plantName: "Tomato",
      imageUrl: null,
      startDate: new Date("2024-04-01T00:00:00Z"),
      daysToMaturity: 80,
      positionX: 100,
      positionY: 120,
      notes: null,
      plant: { id: "plant-1", commonName: "Tomato", daysToMaturity: 80, category: "Fruit" },
      bed: { id: "bed-1", name: "North Bed", garden: { id: "garden-1", name: "Kitchen" } },
    },
  ],
  plantsById: new Map([
    ["plant-2", { id: "plant-2", commonName: "Basil" }],
  ]),
};

describe("matchesSchedule", () => {
  test("matches daily schedule at exact time", () => {
    const zoned = { year: 2024, month: 5, day: 1, hour: 7, minute: 10, weekday: "Wed" };
    expect(matchesSchedule(zoned, "FREQ=DAILY;BYHOUR=7;BYMINUTE=10")).toBe(true);
    expect(matchesSchedule(zoned, "FREQ=DAILY;BYHOUR=8;BYMINUTE=0")).toBe(false);
  });

  test("matches weekly schedule by weekday", () => {
    const zoned = { year: 2024, month: 5, day: 5, hour: 16, minute: 0, weekday: "Sun" };
    expect(matchesSchedule(zoned, "FREQ=WEEKLY;BYDAY=SU;BYHOUR=16;BYMINUTE=0")).toBe(true);
    expect(matchesSchedule(zoned, "FREQ=WEEKLY;BYDAY=MO;BYHOUR=16;BYMINUTE=0")).toBe(false);
  });
});

describe("buildFocusDigest", () => {
  test("orders focus items before other tasks", () => {
    const focusContext = {
      ...baseContext,
      focusItems: [
        { id: "focus-planting", userId: "user", kind: "planting", targetId: "planting-1", label: null, createdAt: new Date() },
        { id: "focus-plant", userId: "user", kind: "plant", targetId: "plant-2", label: "Basil trials", createdAt: new Date() },
      ],
    } as unknown as Parameters<typeof buildFocusDigest>[0];

    const lines = buildFocusDigest(focusContext);
    expect(lines[0]).toMatch(/Tomato/);
    expect(lines[1]).toMatch(/Basil/);
  });
});

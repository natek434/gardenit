import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    climatePlantWindow: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/src/lib/prisma";
import { getSeasonality } from "@/src/lib/seasonality";

const prismaMock = prisma as unknown as {
  climatePlantWindow: { findUnique: ReturnType<typeof vi.fn> };
};

describe("getSeasonality", () => {
  beforeEach(() => {
    prismaMock.climatePlantWindow.findUnique.mockReset();
  });

  it("returns NOW when month in range", async () => {
    prismaMock.climatePlantWindow.findUnique.mockResolvedValue({
      sowOutdoors: [{ start: 1, end: 3 }],
      sowIndoors: null,
      transplant: null,
    });
    const result = await getSeasonality(new Date("2024-02-01"), "zone", "plant");
    expect(result.status).toBe("NOW");
  });

  it("returns COMING_SOON when month before range", async () => {
    prismaMock.climatePlantWindow.findUnique.mockResolvedValue({
      sowOutdoors: [{ start: 6, end: 8 }],
      sowIndoors: null,
      transplant: null,
    });
    const result = await getSeasonality(new Date("2024-04-01"), "zone", "plant");
    expect(result.status).toBe("COMING_SOON");
  });

  it("returns TOO_LATE when month after range", async () => {
    prismaMock.climatePlantWindow.findUnique.mockResolvedValue({
      sowOutdoors: [{ start: 1, end: 2 }],
      sowIndoors: null,
      transplant: null,
    });
    const result = await getSeasonality(new Date("2024-04-01"), "zone", "plant");
    expect(result.status).toBe("TOO_LATE");
  });
});

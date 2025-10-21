import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    companion: {
      findMany: vi.fn().mockResolvedValue([
        {
          plantId: "a",
          targetPlantId: "b",
          targetName: "B",
          type: "companion",
          reason: "Test",
          plant: { id: "a", commonName: "A" },
          targetPlant: { id: "b", commonName: "B" },
        },
      ]),
    },
  },
}));

import { getCompatibility } from "@/src/server/compatibility-service";
import { prisma } from "@/src/lib/prisma";

const prismaMock = prisma as unknown as {
  companion: { findMany: ReturnType<typeof vi.fn> };
};

describe("getCompatibility", () => {
  it("fetches relationships for given ids", async () => {
    const result = await getCompatibility(["a", "b"]);
    expect(prismaMock.companion.findMany).toHaveBeenCalledWith({
      where: { OR: [{ plantId: { in: ["a", "b"] } }, { targetPlantId: { in: ["a", "b"] } }] },
      include: {
        plant: { select: { id: true, commonName: true } },
        targetPlant: { select: { id: true, commonName: true } },
      },
    });
    expect(result).toHaveLength(1);
  });
});

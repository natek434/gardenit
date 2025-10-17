import { describe, expect, it, vi } from "vitest";

vi.mock("@/src/lib/prisma", () => ({
  prisma: {
    companion: {
      findMany: vi.fn().mockResolvedValue([
        {
          plantAId: "a",
          plantBId: "b",
          type: "companion",
          reason: "Test",
          plantA: { id: "a", commonName: "A" },
          plantB: { id: "b", commonName: "B" },
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
      where: { OR: [{ plantAId: { in: ["a", "b"] } }, { plantBId: { in: ["a", "b"] } }] },
      include: {
        plantA: { select: { id: true, commonName: true } },
        plantB: { select: { id: true, commonName: true } },
      },
    });
    expect(result).toHaveLength(1);
  });
});

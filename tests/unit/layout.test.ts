import { describe, expect, it } from "vitest";
import { calculatePlantCapacity } from "@/src/lib/layout";

describe("calculatePlantCapacity", () => {
  it("computes rows and columns based on spacing", () => {
    expect(calculatePlantCapacity(120, 240, 30, 40)).toBe(24);
  });

  it("throws when spacing invalid", () => {
    expect(() => calculatePlantCapacity(100, 100, 0, 10)).toThrow();
  });
});

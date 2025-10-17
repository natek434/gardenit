import { prisma } from "@/src/lib/prisma";

type SeasonalityStatus = "NOW" | "COMING_SOON" | "TOO_LATE";

export interface SeasonalityResult {
  status: SeasonalityStatus;
  reason: string;
}

type MonthRange = { start: number; end: number };

type RangeType = "sowIndoors" | "sowOutdoors" | "transplant";

function isMonthInRange(month: number, range: MonthRange): boolean {
  if (range.start <= range.end) {
    return month >= range.start && month <= range.end;
  }
  // wraps around end of year
  return month >= range.start || month <= range.end;
}

function evaluateRanges(month: number, ranges: MonthRange[] | null | undefined): SeasonalityStatus | null {
  if (!ranges?.length) return null;
  const inRange = ranges.some((range) => isMonthInRange(month, range));
  if (inRange) return "NOW";
  const nextAvailable = ranges.some((range) => {
    const normalizedStart = range.start;
    if (range.start <= range.end) {
      return month < normalizedStart;
    }
    return month < normalizedStart && month > range.end;
  });
  return nextAvailable ? "COMING_SOON" : "TOO_LATE";
}

export async function getSeasonality(
  date: Date,
  climateZoneId: string,
  plantId: string,
  preferredRange: RangeType = "sowOutdoors",
): Promise<SeasonalityResult> {
  const month = date.getUTCMonth() + 1;
  const window = await prisma.climatePlantWindow.findUnique({
    where: { plantId_climateZoneId: { plantId, climateZoneId } },
  });

  if (!window) {
    return {
      status: "COMING_SOON",
      reason: "No planting window data for this climate zone yet.",
    };
  }

  const primary = evaluateRanges(month, window[preferredRange] as MonthRange[] | null | undefined);
  if (primary) {
    return {
      status: primary,
      reason:
        primary === "NOW"
          ? "Current month is inside the recommended window."
          : primary === "COMING_SOON"
            ? "Current month is before the next planting window."
            : "Planting window has passed for this season.",
    };
  }

  const secondaryTypes: RangeType[] = ["sowIndoors", "transplant", "sowOutdoors"].filter(
    (type) => type !== preferredRange,
  ) as RangeType[];

  for (const type of secondaryTypes) {
    const secondary = evaluateRanges(month, window[type] as MonthRange[] | null | undefined);
    if (secondary) {
      return {
        status: secondary,
        reason:
          type === "transplant"
            ? secondary === "NOW"
              ? "Suitable transplanting window."
              : "Transplanting window is upcoming or passed."
            : secondary === "NOW"
              ? "Indoor sowing window is open."
              : "Indoor sowing window is upcoming or passed.",
      };
    }
  }

  return {
    status: "COMING_SOON",
    reason: "No specific guidance found; defaulting to upcoming status.",
  };
}

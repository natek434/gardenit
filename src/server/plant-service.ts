import { Prisma } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/src/lib/prisma";
import { getSeasonality } from "@/src/lib/seasonality";
import { withCache } from "@/src/lib/cache";

const plantSelect = Prisma.validator<Prisma.PlantSelect>()({
  id: true,
  commonName: true,
  scientificName: true,
  category: true,
  sunRequirement: true,
  soilNotes: true,
  waterGeneral: true,
  sowDepthMm: true,
  spacingInRowCm: true,
  spacingBetweenRowsCm: true,
  daysToMaturity: true,
  careNotes: true,
  createdAt: true,
  updatedAt: true,
});

type PlantBase = Prisma.PlantGetPayload<{ select: typeof plantSelect }>;

type ClimateWindowSelect = {
  select: { climateZoneId: true; sowOutdoors: true; sowIndoors: true; transplant: true };
};

type PlantWindow = Prisma.ClimatePlantWindowGetPayload<ClimateWindowSelect>;

export type PlantWithStatus = PlantBase & {
  climateWindows: PlantWindow[];
  status: AwaitedReturn<typeof getSeasonality>;
};

export type PlantWithRelations = PlantBase & {
  climateWindows: PlantWindow[];
  companions: Array<{ plantB: { commonName: string }; reason: string | null }>;
  antagonists: Array<{ plantB: { commonName: string }; reason: string | null }>;
  status: AwaitedReturn<typeof getSeasonality>;
};

type PlantFilters = {
  query?: string;
  climateZoneId?: string;
};

type AwaitedReturn<T> = T extends Promise<infer U> ? U : never;

export const getPlants = cache(async (filters: PlantFilters = {}, userZone?: string) => {
  return withCache(
    `plants-${filters.query ?? "all"}-${filters.climateZoneId ?? userZone ?? "global"}`,
    async () => {
      const where: Prisma.PlantWhereInput = filters.query
        ? {
            OR: [
              { commonName: { contains: filters.query, mode: "insensitive" } },
              { scientificName: { contains: filters.query, mode: "insensitive" } },
            ],
          }
        : {};

      const plants = await prisma.plant.findMany({
        where,
        select: {
          ...plantSelect,
          climateWindows: {
            select: {
              climateZoneId: true,
              sowOutdoors: true,
              sowIndoors: true,
              transplant: true,
            },
          },
        },
        orderBy: { commonName: "asc" },
      });

      return Promise.all(
        plants.map(async (plant) => {
          const zoneId = filters.climateZoneId ?? userZone ?? plant.climateWindows[0]?.climateZoneId ?? "";
          const status = await getSeasonality(new Date(), zoneId, plant.id);
          return { ...plant, status } satisfies PlantWithStatus;
        }),
      );
    },
  );
});

export const getPlant = cache(async (id: string, zone?: string) => {
  const plant = await prisma.plant.findUnique({
    where: { id },
    include: {
      climateWindows: {
        select: {
          climateZoneId: true,
          sowOutdoors: true,
          sowIndoors: true,
          transplant: true,
        },
      },
      companions: {
        include: { plantB: { select: { commonName: true } } },
        where: { type: "companion" },
      },
      antagonists: {
        include: { plantB: { select: { commonName: true } } },
        where: { type: "antagonist" },
      },
    },
  });
  if (!plant) return null;
  const status = await getSeasonality(new Date(), zone ?? plant.climateWindows[0]?.climateZoneId ?? "", plant.id);
  return { ...plant, status } satisfies PlantWithRelations;
});

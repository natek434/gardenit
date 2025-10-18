import { Prisma } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/src/lib/prisma";
import { getSeasonality } from "@/src/lib/seasonality";
import { withCache } from "@/src/lib/cache";

const plantSelect = Prisma.validator<Prisma.PlantSelect>()({
  perenualId: true,
  id: true,
  commonName: true,
  scientificName: true,
  otherNames: true,
  family: true,
  origin: true,
  plantType: true,
  category: true,
  cycle: true,
  sunRequirement: true,
  sunlightExposure: true,
  soilNotes: true,
  soilPreferences: true,
  waterGeneral: true,
  watering: true,
  wateringGeneralBenchmark: true,
  plantAnatomy: true,
  sowDepthMm: true,
  spacingInRowCm: true,
  spacingBetweenRowsCm: true,
  daysToMaturity: true,
  careNotes: true,
  careLevel: true,
  description: true,
  defaultImage: true,
  otherImages: true,
  imageLocalPath: true,
  pruningMonth: true,
  pruningCount: true,
  seeds: true,
  attracts: true,
  propagationMethods: true,
  hardinessMin: true,
  hardinessMax: true,
  hardinessLocation: true,
  flowers: true,
  floweringSeason: true,
  cones: true,
  fruits: true,
  edibleFruit: true,
  fruitingSeason: true,
  harvestSeason: true,
  harvestMethod: true,
  leaf: true,
  edibleLeaf: true,
  growthRate: true,
  maintenanceLevel: true,
  medicinal: true,
  poisonousToHumans: true,
  poisonousToPets: true,
  droughtTolerant: true,
  saltTolerant: true,
  thorny: true,
  invasive: true,
  rare: true,
  tropical: true,
  cuisine: true,
  indoor: true,
  wateringQuality: true,
  wateringPeriod: true,
  wateringAvgVolume: true,
  wateringDepth: true,
  wateringBasedTemperature: true,
  wateringPhLevel: true,
  sunlightDuration: true,
  createdAt: true,
  updatedAt: true,
});

type PlantBase = Prisma.PlantGetPayload<{ select: typeof plantSelect }>;

const plantAdminSelect = Prisma.validator<Prisma.PlantSelect>()({
  id: true,
  perenualId: true,
  commonName: true,
  scientificName: true,
  otherNames: true,
  family: true,
  origin: true,
  plantType: true,
  category: true,
  cycle: true,
  sunRequirement: true,
  sunlightExposure: true,
  soilNotes: true,
  soilPreferences: true,
  waterGeneral: true,
  watering: true,
  wateringGeneralBenchmark: true,
  plantAnatomy: true,
  pruningMonth: true,
  pruningCount: true,
  seeds: true,
  attracts: true,
  propagationMethods: true,
  hardinessMin: true,
  hardinessMax: true,
  hardinessLocation: true,
  flowers: true,
  floweringSeason: true,
  cones: true,
  fruits: true,
  edibleFruit: true,
  fruitingSeason: true,
  harvestSeason: true,
  harvestMethod: true,
  leaf: true,
  edibleLeaf: true,
  daysToMaturity: true,
  growthRate: true,
  maintenanceLevel: true,
  medicinal: true,
  poisonousToHumans: true,
  poisonousToPets: true,
  droughtTolerant: true,
  saltTolerant: true,
  thorny: true,
  invasive: true,
  rare: true,
  tropical: true,
  cuisine: true,
  indoor: true,
  careLevel: true,
  careNotes: true,
  description: true,
  defaultImage: true,
  otherImages: true,
  imageLocalPath: true,
  wateringQuality: true,
  wateringPeriod: true,
  wateringAvgVolume: true,
  wateringDepth: true,
  wateringBasedTemperature: true,
  wateringPhLevel: true,
  sunlightDuration: true,
  sowDepthMm: true,
  spacingInRowCm: true,
  spacingBetweenRowsCm: true,
  climateWindows: {
    select: {
      id: true,
      climateZoneId: true,
      sowIndoors: true,
      sowOutdoors: true,
      transplant: true,
      notes: true,
      climateZone: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
});

export type PlantAdminSummary = Prisma.PlantGetPayload<{ select: typeof plantAdminSelect }>;

export type ClimateWindowUpsertInput = {
  id?: string;
  climateZoneId: string;
  sowIndoors: Prisma.JsonValue | null;
  sowOutdoors: Prisma.JsonValue | null;
  transplant: Prisma.JsonValue | null;
  notes: string | null;
};

export type PlantAdminUpdateInput = {
  plant?: Partial<{
    perenualId: number | null;
    commonName: string;
    scientificName: string | null;
    otherNames: string[];
    family: string | null;
    origin: string | null;
    plantType: string | null;
    category: string;
    cycle: string | null;
    sunRequirement: string;
    sunlightExposure: string[];
    soilNotes: string | null;
    soilPreferences: string[];
    waterGeneral: string;
    watering: string | null;
    wateringGeneralBenchmark: Prisma.JsonValue | null;
    plantAnatomy: Prisma.JsonValue | null;
    pruningMonth: string[];
    pruningCount: Prisma.JsonValue | null;
    seeds: number | null;
    attracts: string[];
    propagationMethods: string[];
    hardinessMin: string | null;
    hardinessMax: string | null;
    hardinessLocation: Prisma.JsonValue | null;
    flowers: boolean | null;
    floweringSeason: string | null;
    cones: boolean | null;
    fruits: boolean | null;
    edibleFruit: boolean | null;
    fruitingSeason: string | null;
    harvestSeason: string | null;
    harvestMethod: string | null;
    leaf: boolean | null;
    edibleLeaf: boolean | null;
    daysToMaturity: number | null;
    growthRate: string | null;
    maintenanceLevel: string | null;
    medicinal: boolean | null;
    poisonousToHumans: boolean | null;
    poisonousToPets: boolean | null;
    droughtTolerant: boolean | null;
    saltTolerant: boolean | null;
    thorny: boolean | null;
    invasive: boolean | null;
    rare: boolean | null;
    tropical: boolean | null;
    cuisine: boolean | null;
    indoor: boolean | null;
    careLevel: string | null;
    careNotes: string | null;
    description: string | null;
    defaultImage: Prisma.JsonValue | null;
    otherImages: Prisma.JsonValue | null;
    imageLocalPath: string | null;
    wateringQuality: string[];
    wateringPeriod: string[];
    wateringAvgVolume: Prisma.JsonValue | null;
    wateringDepth: Prisma.JsonValue | null;
    wateringBasedTemperature: Prisma.JsonValue | null;
    wateringPhLevel: Prisma.JsonValue | null;
    sunlightDuration: Prisma.JsonValue | null;
    sowDepthMm: number | null;
    spacingInRowCm: number | null;
    spacingBetweenRowsCm: number | null;
  }>;
  climateWindows?: ClimateWindowUpsertInput[];
  deleteClimateWindowIds?: string[];
};

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

export function getPlantsForAdmin(limit = 50) {
  return prisma.plant.findMany({
    select: plantAdminSelect,
    orderBy: { commonName: "asc" },
    take: limit,
  });
}

export async function updatePlantForAdmin(id: string, data: PlantAdminUpdateInput) {
  return prisma.$transaction(async (tx) => {
    if (data.plant && Object.keys(data.plant).length > 0) {
      await tx.plant.update({
        where: { id },
        data: data.plant,
      });
    }

    if (data.deleteClimateWindowIds && data.deleteClimateWindowIds.length > 0) {
      await tx.climatePlantWindow.deleteMany({
        where: { id: { in: data.deleteClimateWindowIds }, plantId: id },
      });
    }

    if (data.climateWindows && data.climateWindows.length > 0) {
      await Promise.all(
        data.climateWindows.map((window) =>
          tx.climatePlantWindow.upsert({
            where: window.id
              ? { id: window.id }
              : { plantId_climateZoneId: { plantId: id, climateZoneId: window.climateZoneId } },
            update: {
              sowIndoors: window.sowIndoors,
              sowOutdoors: window.sowOutdoors,
              transplant: window.transplant,
              notes: window.notes,
            },
            create: {
              plantId: id,
              climateZoneId: window.climateZoneId,
              sowIndoors: window.sowIndoors,
              sowOutdoors: window.sowOutdoors,
              transplant: window.transplant,
              notes: window.notes,
            },
          }),
        ),
      );
    }

    // Ensure every climate zone has a placeholder entry for this plant so the admin UI stays in sync.
    const zones = await tx.climateZone.findMany({ select: { id: true } });
    await Promise.all(
      zones.map((zone) =>
        tx.climatePlantWindow.upsert({
          where: { plantId_climateZoneId: { plantId: id, climateZoneId: zone.id } },
          update: {},
          create: {
            plantId: id,
            climateZoneId: zone.id,
          },
        }),
      ),
    );

    return tx.plant.findUniqueOrThrow({
      where: { id },
      select: plantAdminSelect,
    });
  });
}

import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { persistPlantImage } from "./utils/image-store";

const prisma = new PrismaClient();

const ImageInputSchema = z
  .object({
    sourceUrl: z.string().url().optional(),
    localFile: z.string().optional(),
    fileName: z.string().optional(),
  })
  .refine((value) => Boolean(value.sourceUrl || value.localFile), {
    message: "Provide either sourceUrl or localFile for the image.",
    path: ["source"],
  });

const ClimateWindowSchema = z.object({
  climateZoneId: z.string(),
  sowIndoors: z
    .array(z.object({ start: z.number().min(1).max(12), end: z.number().min(1).max(12) }))
    .optional(),
  sowOutdoors: z
    .array(z.object({ start: z.number().min(1).max(12), end: z.number().min(1).max(12) }))
    .optional(),
  transplant: z
    .array(z.object({ start: z.number().min(1).max(12), end: z.number().min(1).max(12) }))
    .optional(),
  notes: z.string().optional(),
});

const PlantInputSchema = z.object({
  perenualId: z.number().int().optional(),
  commonName: z.string().min(1),
  scientificName: z.string().optional(),
  otherNames: z.array(z.string()).optional(),
  family: z.string().optional(),
  origin: z.union([z.string(), z.array(z.string())]).optional(),
  plantType: z.string().optional(),
  category: z.enum(["vegetable", "herb", "fruit"]),
  cycle: z.string().optional(),
  sunRequirement: z.string().min(1),
  sunlightExposure: z.array(z.string()).optional(),
  soilNotes: z.string().optional(),
  soilPreferences: z.array(z.string()).optional(),
  waterGeneral: z.string().min(1),
  watering: z.string().optional(),
  careNotes: z.string().optional(),
  description: z.string().optional(),
  daysToMaturity: z.number().int().positive().optional(),
  careLevel: z.string().optional(),
  maintenanceLevel: z.string().optional(),
  growthRate: z.string().optional(),
  medicinal: z.boolean().optional(),
  poisonousToHumans: z.boolean().optional(),
  poisonousToPets: z.boolean().optional(),
  droughtTolerant: z.boolean().optional(),
  saltTolerant: z.boolean().optional(),
  thorny: z.boolean().optional(),
  indoor: z.boolean().optional(),
  edibleFruit: z.boolean().optional(),
  edibleLeaf: z.boolean().optional(),
  fruitingSeason: z.string().optional(),
  harvestSeason: z.string().optional(),
  harvestMethod: z.string().optional(),
  waterBenchmarkValue: z.string().optional(),
  waterBenchmarkUnit: z.string().optional(),
  propagationMethods: z.array(z.string()).optional(),
  attracts: z.array(z.string()).optional(),
  pruningMonth: z.array(z.string()).optional(),
  seeds: z.number().int().optional(),
  climateWindows: z.array(ClimateWindowSchema).optional(),
  image: ImageInputSchema.optional(),
});

const FileSchema = z.object({
  plants: z.array(PlantInputSchema),
});

function summarise(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 280 ? `${trimmed.slice(0, 277)}...` : trimmed;
}

async function loadFile(filePath: string) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const contents = await readFile(resolved, "utf-8");
  const json = JSON.parse(contents);
  return FileSchema.parse(json);
}

function normaliseOrigin(origin: z.infer<typeof PlantInputSchema>["origin"]): string | null {
  if (!origin) return null;
  if (Array.isArray(origin)) {
    return origin.length ? origin.join(", ") : null;
  }
  const trimmed = origin.trim();
  return trimmed ? trimmed : null;
}

function toPlantPayload(
  input: z.infer<typeof PlantInputSchema>,
  imageLocalPath: string | null,
): Prisma.PlantUncheckedCreateInput {
  const wateringGeneralBenchmark = input.waterBenchmarkValue
    ? { value: input.waterBenchmarkValue, unit: input.waterBenchmarkUnit ?? null }
    : Prisma.JsonNull;

  return {
    perenualId: input.perenualId ?? null,
    commonName: input.commonName,
    scientificName: input.scientificName ?? null,
    otherNames: input.otherNames ?? [],
    family: input.family ?? null,
    origin: normaliseOrigin(input.origin),
    plantType: input.plantType ?? null,
    category: input.category,
    cycle: input.cycle ?? null,
    sunRequirement: input.sunRequirement,
    sunlightExposure: input.sunlightExposure ?? [],
    soilNotes: input.soilNotes ?? null,
    soilPreferences: input.soilPreferences ?? [],
    waterGeneral: input.waterGeneral,
    watering: input.watering ?? null,
    wateringGeneralBenchmark,
    plantAnatomy: Prisma.JsonNull,
    pruningMonth: input.pruningMonth ?? [],
    pruningCount: Prisma.JsonNull,
    seeds: input.seeds ?? null,
    attracts: input.attracts ?? [],
    propagationMethods: input.propagationMethods ?? [],
    hardinessMin: null,
    hardinessMax: null,
    hardinessLocation: Prisma.JsonNull,
    flowers: null,
    floweringSeason: null,
    cones: null,
    fruits: null,
    edibleFruit: input.edibleFruit ?? null,
    fruitingSeason: input.fruitingSeason ?? null,
    harvestSeason: input.harvestSeason ?? null,
    harvestMethod: input.harvestMethod ?? null,
    leaf: null,
    edibleLeaf: input.edibleLeaf ?? null,
    daysToMaturity: input.daysToMaturity ?? null,
    growthRate: input.growthRate ?? null,
    maintenanceLevel: input.maintenanceLevel ?? null,
    medicinal: input.medicinal ?? null,
    poisonousToHumans: input.poisonousToHumans ?? null,
    poisonousToPets: input.poisonousToPets ?? null,
    droughtTolerant: input.droughtTolerant ?? null,
    saltTolerant: input.saltTolerant ?? null,
    thorny: input.thorny ?? null,
    invasive: null,
    rare: null,
    tropical: null,
    cuisine: null,
    indoor: input.indoor ?? null,
    careLevel: input.careLevel ?? null,
    careNotes: summarise(input.careNotes),
    description: input.description ?? null,
    defaultImage: imageLocalPath ? { localPath: imageLocalPath } : Prisma.JsonNull,
    otherImages: Prisma.JsonNull,
    imageLocalPath,
    wateringQuality: [],
    wateringPeriod: [],
    wateringAvgVolume: Prisma.JsonNull,
    wateringDepth: Prisma.JsonNull,
    wateringBasedTemperature: Prisma.JsonNull,
    wateringPhLevel: Prisma.JsonNull,
    sunlightDuration: Prisma.JsonNull,
    sowDepthMm: null,
    spacingInRowCm: null,
    spacingBetweenRowsCm: null,
  } satisfies Prisma.PlantUncheckedCreateInput;
}

async function upsertClimateWindows(plantId: string, windows: z.infer<typeof ClimateWindowSchema>[] = []) {
  if (!windows.length) return;
  await prisma.climatePlantWindow.deleteMany({ where: { plantId } });
  await prisma.climatePlantWindow.createMany({
    data: windows.map((window) => ({
      plantId,
      climateZoneId: window.climateZoneId,
      sowIndoors: window.sowIndoors ?? Prisma.JsonNull,
      sowOutdoors: window.sowOutdoors ?? Prisma.JsonNull,
      transplant: window.transplant ?? Prisma.JsonNull,
      notes: window.notes ?? null,
    })),
  });
}

async function processPlant(input: z.infer<typeof PlantInputSchema>) {
  const imageLocalPath = input.image
    ? await persistPlantImage({
        commonName: input.commonName,
        sourceUrl: input.image.sourceUrl,
        localFile: input.image.localFile,
        fileNameHint: input.image.fileName,
      }).catch((error) => {
        console.warn(`Could not persist image for ${input.commonName}: ${error instanceof Error ? error.message : error}`);
        return null;
      })
    : null;

  const payload = toPlantPayload(input, imageLocalPath);

  let existing = null;
  if (payload.perenualId != null) {
    existing = await prisma.plant.findUnique({ where: { perenualId: payload.perenualId } });
  }
  if (!existing) {
    existing = await prisma.plant.findFirst({ where: { commonName: payload.commonName } });
  }

  const plant = existing
    ? await prisma.plant.update({ where: { id: existing.id }, data: payload })
    : await prisma.plant.create({ data: payload });

  if (input.climateWindows?.length) {
    await upsertClimateWindows(plant.id, input.climateWindows);
  }

  console.log(`Imported ${plant.commonName}`);
}

async function main() {
  const fileArgIndex = process.argv.findIndex((arg) => arg === "--file");
  const filePath =
    fileArgIndex !== -1 && process.argv[fileArgIndex + 1]
      ? process.argv[fileArgIndex + 1]
      : "data/manual-plant-import.json";

  const data = await loadFile(filePath);

  for (const plant of data.plants) {
    await processPlant(plant);
  }

  console.log(`\nSuccessfully processed ${data.plants.length} plants from ${filePath}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

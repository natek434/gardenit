import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import {
  updatePlantForAdmin,
  type PlantAdminUpdateInput,
  type ClimateWindowUpsertInput,
} from "@/src/server/plant-service";

const jsonValue: z.ZodType<Prisma.InputJsonValue> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.array(jsonValue), z.record(jsonValue)]),
);

const stringArray = z.array(z.string());

const plantSchema = z.object({
  perenualId: z.number().int().nullable().optional(),
  commonName: z.string().min(1).optional(),
  scientificName: z.string().nullable().optional(),
  otherNames: stringArray.optional(),
  family: z.string().nullable().optional(),
  origin: z.string().nullable().optional(),
  plantType: z.string().nullable().optional(),
  category: z.string().min(1).optional(),
  cycle: z.string().nullable().optional(),
  sunRequirement: z.string().min(1).optional(),
  sunlightExposure: stringArray.optional(),
  soilNotes: z.string().nullable().optional(),
  soilPreferences: stringArray.optional(),
  waterGeneral: z.string().min(1).optional(),
  watering: z.string().nullable().optional(),
  wateringGeneralBenchmark: jsonValue.nullable().optional(),
  plantAnatomy: jsonValue.nullable().optional(),
  pruningMonth: stringArray.optional(),
  pruningCount: jsonValue.nullable().optional(),
  seeds: z.number().int().nullable().optional(),
  attracts: stringArray.optional(),
  propagationMethods: stringArray.optional(),
  hardinessMin: z.string().nullable().optional(),
  hardinessMax: z.string().nullable().optional(),
  hardinessLocation: jsonValue.nullable().optional(),
  flowers: z.boolean().nullable().optional(),
  floweringSeason: z.string().nullable().optional(),
  cones: z.boolean().nullable().optional(),
  fruits: z.boolean().nullable().optional(),
  edibleFruit: z.boolean().nullable().optional(),
  fruitingSeason: z.string().nullable().optional(),
  harvestSeason: z.string().nullable().optional(),
  harvestMethod: z.string().nullable().optional(),
  leaf: z.boolean().nullable().optional(),
  edibleLeaf: z.boolean().nullable().optional(),
  daysToMaturity: z.number().int().nullable().optional(),
  growthRate: z.string().nullable().optional(),
  maintenanceLevel: z.string().nullable().optional(),
  medicinal: z.boolean().nullable().optional(),
  poisonousToHumans: z.boolean().nullable().optional(),
  poisonousToPets: z.boolean().nullable().optional(),
  droughtTolerant: z.boolean().nullable().optional(),
  saltTolerant: z.boolean().nullable().optional(),
  thorny: z.boolean().nullable().optional(),
  invasive: z.boolean().nullable().optional(),
  rare: z.boolean().nullable().optional(),
  tropical: z.boolean().nullable().optional(),
  cuisine: z.boolean().nullable().optional(),
  indoor: z.boolean().nullable().optional(),
  careLevel: z.string().nullable().optional(),
  careNotes: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  defaultImage: jsonValue.nullable().optional(),
  otherImages: jsonValue.nullable().optional(),
  imageLocalPath: z.string().nullable().optional(),
  wateringQuality: stringArray.optional(),
  wateringPeriod: stringArray.optional(),
  wateringAvgVolume: jsonValue.nullable().optional(),
  wateringDepth: jsonValue.nullable().optional(),
  wateringBasedTemperature: jsonValue.nullable().optional(),
  wateringPhLevel: jsonValue.nullable().optional(),
  sunlightDuration: jsonValue.nullable().optional(),
  sowDepthMm: z.number().int().nullable().optional(),
  spacingInRowCm: z.number().int().nullable().optional(),
  spacingBetweenRowsCm: z.number().int().nullable().optional(),
});

const climateWindowSchema = z.object({
  id: z.string().optional(),
  climateZoneId: z.string().min(1),
  sowIndoors: jsonValue.nullable(),
  sowOutdoors: jsonValue.nullable(),
  transplant: jsonValue.nullable(),
  notes: z.string().nullable().optional(),
});

const updateSchema = z
  .object({
    plant: plantSchema.optional(),
    climateWindows: z.array(climateWindowSchema).optional(),
    deleteClimateWindowIds: z.array(z.string()).optional(),
  })
  .refine((value) => {
    return (
      (value.plant && Object.keys(value.plant).length > 0) ||
      (value.climateWindows && value.climateWindows.length > 0) ||
      (value.deleteClimateWindowIds && value.deleteClimateWindowIds.length > 0)
    );
  }, { message: "No changes provided" });

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    const rawPlant = parsed.data.plant
      ? normalisePlantPayload(
          removeUndefined(parsed.data.plant) as NonNullable<PlantAdminUpdateInput["plant"]>,
        )
      : undefined;
    const plantPayload = rawPlant && Object.keys(rawPlant).length > 0 ? rawPlant : undefined;
    const climateWindows: ClimateWindowUpsertInput[] | undefined = parsed.data.climateWindows?.map((window) => ({
      id: window.id ?? undefined,
      climateZoneId: window.climateZoneId,
      sowIndoors: window.sowIndoors ?? Prisma.JsonNull,
      sowOutdoors: window.sowOutdoors ?? Prisma.JsonNull,
      transplant: window.transplant ?? Prisma.JsonNull,
      notes: window.notes ?? null,
    }));
    const deleteClimateWindowIds = parsed.data.deleteClimateWindowIds?.length
      ? parsed.data.deleteClimateWindowIds
      : undefined;

    const plant = await updatePlantForAdmin(params.id, {
      plant: plantPayload,
      climateWindows,
      deleteClimateWindowIds,
    });
    revalidatePath("/admin/plants");
    return NextResponse.json({ plant });
  } catch (error) {
    return NextResponse.json({ error: "Unable to update plant" }, { status: 500 });
  }
}

function removeUndefined<T extends Record<string, unknown>>(object: T) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined)) as T;
}

const plantJsonFields = new Set<keyof NonNullable<PlantAdminUpdateInput["plant"]>>([
  "wateringGeneralBenchmark",
  "plantAnatomy",
  "pruningCount",
  "hardinessLocation",
  "defaultImage",
  "otherImages",
  "wateringAvgVolume",
  "wateringDepth",
  "wateringBasedTemperature",
  "wateringPhLevel",
  "sunlightDuration",
]);

function normalisePlantPayload(
  plant: NonNullable<PlantAdminUpdateInput["plant"]>,
): NonNullable<PlantAdminUpdateInput["plant"]> {
  return Object.fromEntries(
    Object.entries(plant).map(([key, value]) => {
      if (plantJsonFields.has(key as keyof NonNullable<PlantAdminUpdateInput["plant"]>)) {
        if (value === undefined) return [key, value];
        return [key, value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue)];
      }
      return [key, value];
    }),
  ) as NonNullable<PlantAdminUpdateInput["plant"]>;
}

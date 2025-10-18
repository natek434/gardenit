import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const prisma = new PrismaClient();

const ClimateZoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  country: z.string().min(1),
  frostFirst: z.string().datetime().nullable().optional(),
  frostLast: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
});

const FileSchema = z.object({
  zones: z.array(ClimateZoneSchema),
});

async function loadFile(filePath: string) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const contents = await readFile(resolved, "utf-8");
  return FileSchema.parse(JSON.parse(contents));
}

async function upsertZone(zone: z.infer<typeof ClimateZoneSchema>) {
  await prisma.climateZone.upsert({
    where: { id: zone.id },
    update: {
      name: zone.name,
      country: zone.country,
      frostFirst: zone.frostFirst ? new Date(zone.frostFirst) : null,
      frostLast: zone.frostLast ? new Date(zone.frostLast) : null,
      notes: zone.notes ?? null,
    },
    create: {
      id: zone.id,
      name: zone.name,
      country: zone.country,
      frostFirst: zone.frostFirst ? new Date(zone.frostFirst) : null,
      frostLast: zone.frostLast ? new Date(zone.frostLast) : null,
      notes: zone.notes ?? null,
    },
  });
}

async function main() {
  const arg = process.argv.slice(2).find((value) => value !== "--");
  const filePath = arg ?? "data/manual-climate-import.json";
  const { zones } = await loadFile(filePath);
  if (!zones.length) {
    console.warn("No zones found in", filePath);
    return;
  }

  for (const zone of zones) {
    await upsertZone(zone);
    console.log(`Upserted zone ${zone.id} (${zone.name})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

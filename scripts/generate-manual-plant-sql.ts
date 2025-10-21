import { writeFile } from "node:fs/promises";
import path from "node:path";
import { readFileSync } from "node:fs";

interface PlantInput {
  perenualId?: number;
  commonName: string;
  scientificName?: string;
  otherNames?: string[];
  family?: string;
  origin?: string;
  plantType?: string;
  category: string;
  cycle?: string;
  sunRequirement: string;
  sunlightExposure?: string[];
  soilNotes?: string;
  soilPreferences?: string[];
  waterGeneral: string;
  watering?: string;
  waterBenchmarkValue?: string;
  waterBenchmarkUnit?: string;
  propagationMethods?: string[];
  diseases?: string[];
  growthRate?: string;
  maintenanceLevel?: string;
  medicinal?: boolean;
  poisonousToHumans?: boolean;
  poisonousToPets?: boolean;
  droughtTolerant?: boolean;
  saltTolerant?: boolean;
  thorny?: boolean;
  indoor?: boolean;
  edibleFruit?: boolean;
  edibleLeaf?: boolean;
  careLevel?: string;
  careNotes?: string;
  description?: string;
  image?: {
    sourceUrl?: string;
    fileName?: string;
  };
}

interface ManualFile {
  plants: PlantInput[];
}

function escapeString(value: string | undefined | null): string {
  if (value == null) return "NULL";
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
}

function arrayLiteral(values: string[] | undefined | null): string {
  if (!values?.length) {
    return "'{}'::text[]";
  }
  const escaped = values.map((value) => value.replace(/"/g, '\\"'));
  return `'{"${escaped.join('\",\"')}"}'::text[]`;
}

function booleanLiteral(value: boolean | undefined | null): string {
  if (value == null) return "NULL";
  return value ? "TRUE" : "FALSE";
}

function benchmarkJson(value?: string, unit?: string): string {
  if (!value) return "NULL";
  const payload = { value, unit: unit ?? null };
  return `'${JSON.stringify(payload)}'::jsonb`;
}

function defaultImageJson(image: PlantInput["image"]): string {
  if (!image?.sourceUrl && !image?.fileName) {
    return "NULL";
  }
  const payload = {
    sourceUrl: image?.sourceUrl ?? null,
    fileName: image?.fileName ?? null,
  };
  return `'${JSON.stringify(payload)}'::jsonb`;
}

function buildInsert(plant: PlantInput): string {
  const columns = [
    '"perenualId"',
    '"commonName"',
    '"scientificName"',
    '"family"',
    '"origin"',
    '"plantType"',
    '"category"',
    '"cycle"',
    '"sunRequirement"',
    '"sunlightExposure"',
    '"soilNotes"',
    '"soilPreferences"',
    '"waterGeneral"',
    '"watering"',
    '"wateringGeneralBenchmark"',
    '"propagationMethods"',
    '"diseases"',
    '"growthRate"',
    '"maintenanceLevel"',
    '"medicinal"',
    '"poisonousToHumans"',
    '"poisonousToPets"',
    '"droughtTolerant"',
    '"saltTolerant"',
    '"thorny"',
    '"indoor"',
    '"edibleFruit"',
    '"edibleLeaf"',
    '"careLevel"',
    '"careNotes"',
    '"description"',
    '"defaultImage"',
    '"imageLocalPath"',
    '"wateringQuality"',
    '"wateringPeriod"'
  ];

  const values = [
    plant.perenualId ?? "NULL",
    escapeString(plant.commonName),
    escapeString(plant.scientificName ?? null),
    escapeString(plant.family ?? null),
    escapeString(plant.origin ?? null),
    escapeString(plant.plantType ?? null),
    escapeString(plant.category),
    escapeString(plant.cycle ?? null),
    escapeString(plant.sunRequirement),
    arrayLiteral(plant.sunlightExposure ?? []),
    escapeString(plant.soilNotes ?? null),
    arrayLiteral(plant.soilPreferences ?? []),
    escapeString(plant.waterGeneral),
    escapeString(plant.watering ?? null),
    benchmarkJson(plant.waterBenchmarkValue, plant.waterBenchmarkUnit),
    arrayLiteral(plant.propagationMethods ?? []),
    arrayLiteral(plant.diseases ?? []),
    escapeString(plant.growthRate ?? null),
    escapeString(plant.maintenanceLevel ?? null),
    booleanLiteral(plant.medicinal ?? null),
    booleanLiteral(plant.poisonousToHumans ?? null),
    booleanLiteral(plant.poisonousToPets ?? null),
    booleanLiteral(plant.droughtTolerant ?? null),
    booleanLiteral(plant.saltTolerant ?? null),
    booleanLiteral(plant.thorny ?? null),
    booleanLiteral(plant.indoor ?? null),
    booleanLiteral(plant.edibleFruit ?? null),
    booleanLiteral(plant.edibleLeaf ?? null),
    escapeString(plant.careLevel ?? null),
    escapeString(plant.careNotes ?? null),
    escapeString(plant.description ?? null),
    defaultImageJson(plant.image),
    "NULL",
    "'{}'::text[]",
    "'{}'::text[]"
  ];

  const assignments = columns
    .map((column, index) => `${column} = EXCLUDED.${column.replace(/"/g, "")}`)
    .join(", ");

  return `INSERT INTO "Plant" (${columns.join(", ")})\nVALUES (${values.join(", ")})\nON CONFLICT ("perenualId") DO UPDATE SET ${assignments};`;
}

async function main() {
  const filePath = path.resolve(process.cwd(), "data/manual-plant-import.json");
  const contents = readFileSync(filePath, "utf-8");
  const manualData = JSON.parse(contents) as ManualFile;

  const statements = manualData.plants.map((plant) => buildInsert(plant));
  const sql = `-- SQL upserts generated from manual-plant-import.json\n${statements.join("\n\n")}\n`;

  const outputPath = path.resolve(process.cwd(), "data/manual-plant-import.sql");
  await writeFile(outputPath, sql, "utf-8");
  console.log(`Wrote ${manualData.plants.length} statements to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

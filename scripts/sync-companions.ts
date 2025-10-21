import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type RelationshipRow = {
  plant: string;
  bestCompanions: string[];
  worstCompanions: string[];
};

type PlantRecord = {
  id: string;
  names: string[];
  normalizedNames: string[];
};

type MatchResult = {
  record: PlantRecord;
  score: number;
  matchedName: string;
};

const prisma = new PrismaClient();

const DEFAULT_THRESHOLD = 0.55;

async function loadRelationships(): Promise<RelationshipRow[]> {
  const here = fileURLToPath(import.meta.url);
  const dataPath = path.resolve(path.dirname(here), "../data/plant-companions.json");
  const raw = await readFile(dataPath, "utf8");
  return JSON.parse(raw) as RelationshipRow[];
}

async function loadPlants(): Promise<PlantRecord[]> {
  const plants = await prisma.plant.findMany({
    select: {
      id: true,
      commonName: true,
      otherNames: true,
    },
  });

  return plants.map((plant) => {
    const names = [plant.commonName, ...(plant.otherNames ?? [])].filter(Boolean);
    const normalizedNames = names.map(normalizeName).filter(Boolean);
    return {
      id: plant.id,
      names,
      normalizedNames,
    };
  });
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalized: string): string[] {
  if (!normalized) return [];
  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token));
}

function addPluralVariants(variants: Set<string>, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;

  const tokens = trimmed.split(/\s+/);
  const last = tokens.at(-1);
  if (!last) return;

  const prefix = tokens.slice(0, -1).join(" ");
  const prefixWithSpace = prefix ? `${prefix} ` : "";
  const lower = last.toLowerCase();

  const addWord = (word: string) => {
    const candidate = `${prefixWithSpace}${word}`.trim();
    if (candidate) variants.add(candidate);
  };

  if (!lower.endsWith("s")) {
    if (lower.endsWith("y") && last.length > 1 && !/[aeiou]y$/i.test(last)) {
      addWord(`${last.slice(0, -1)}ies`);
    } else if (/(?:ch|sh|x|z|s|o)$/i.test(lower)) {
      addWord(`${last}es`);
    } else {
      addWord(`${last}s`);
    }
  }

  if (lower.endsWith("ies") && last.length > 3) {
    addWord(`${last.slice(0, -3)}y`);
  } else if (/(?:ches|shes|xes|zes|ses|oes)$/i.test(lower) && last.length > 2) {
    addWord(`${last.slice(0, -2)}`);
  } else if (lower.endsWith("s") && !lower.endsWith("us") && !lower.endsWith("ss") && last.length > 3) {
    addWord(`${last.slice(0, -1)}`);
  }
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarity(normalizedA: string, normalizedB: string): number {
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 1;

  const lev = 1 - levenshtein(normalizedA, normalizedB) / Math.max(normalizedA.length, normalizedB.length);
  let substringScore = 0;
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    substringScore = Math.min(normalizedA.length, normalizedB.length) / Math.max(normalizedA.length, normalizedB.length);
  }

  const tokensA = tokenize(normalizedA);
  const tokensB = tokenize(normalizedB);
  let tokenScore = 0;
  if (tokensA.length && tokensB.length) {
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) intersection += 1;
    }
    const union = new Set([...setA, ...setB]).size;
    tokenScore = union === 0 ? 0 : intersection / union;
  }

  return Math.max(lev, substringScore, tokenScore);
}

function buildNameVariants(name: string): string[] {
  const variants = new Set<string>();
  const trimmed = name.trim();
  if (!trimmed) return [];
  variants.add(trimmed);

  const withoutParens = trimmed.replace(/\([^\)]*\)/g, "").replace(/\s+/g, " ").trim();
  if (withoutParens && withoutParens !== trimmed) {
    variants.add(withoutParens);
  }

  const parenMatch = trimmed.match(/\(([^\)]+)\)/);
  if (parenMatch) {
    const inside = parenMatch[1].replace(/[+&]/g, " ").replace(/\s+/g, " ").trim();
    if (inside) {
      variants.add(inside);
      const baseWithoutParen = trimmed.replace(/\s*\([^\)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
      if (baseWithoutParen) {
        const baseTokens = baseWithoutParen.split(" ").filter(Boolean);
        const last = baseTokens.at(-1);
        if (last) {
          variants.add(`${inside} ${last}`.replace(/\s+/g, " ").trim());
        }
      }
    }
  }

  const normalizedTokens = withoutParens ? withoutParens.split(/[,/]/).map((token) => token.trim()) : [];
  for (const token of normalizedTokens) {
    if (token) variants.add(token);
  }

  const snapshot = Array.from(variants);
  for (const variant of snapshot) {
    addPluralVariants(variants, variant);
  }

  return Array.from(variants);
}

function matchPlant(name: string, plants: PlantRecord[], threshold: number): MatchResult | null {
  const variants = buildNameVariants(name);
  variants.push(name);
  let best: MatchResult | null = null;

  for (const variant of variants) {
    const normalizedVariant = normalizeName(variant);
    if (!normalizedVariant) continue;

    for (const plant of plants) {
      for (const candidate of plant.normalizedNames) {
        const score = similarity(normalizedVariant, candidate);
        if (!best || score > best.score) {
          best = {
            record: plant,
            score,
            matchedName: plant.names[plant.normalizedNames.indexOf(candidate)] ?? plant.names[0],
          };
        }
      }
    }
  }

  if (!best || best.score < threshold) {
    return null;
  }

  return best;
}

type RelationshipType = "companion" | "antagonist";

type PendingRow = {
  plantId: string;
  targetPlantId: string | null;
  targetName: string;
  type: RelationshipType;
};

function rowKey(row: PendingRow | { plantId: string; targetPlantId: string | null; targetName: string; type: RelationshipType }) {
  const identity = row.targetPlantId ?? normalizeName(row.targetName);
  return `${row.plantId}|${row.type}|${identity}`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const commit = args.has("--commit");
  const thresholdArg = Array.from(args).find((arg) => arg.startsWith("--threshold="));
  const threshold = thresholdArg ? Number(thresholdArg.split("=")[1]) || DEFAULT_THRESHOLD : DEFAULT_THRESHOLD;

  const [relationships, plants] = await Promise.all([loadRelationships(), loadPlants()]);
  const pending: PendingRow[] = [];
  const pendingKeys = new Set<string>();
  const warnings: string[] = [];

  const existing = await prisma.companion.findMany({
    select: {
      plantId: true,
      targetPlantId: true,
      targetName: true,
      type: true,
    },
  });
  const existingKeys = new Set(existing.map((entry) => rowKey(entry)));

  for (const row of relationships) {
    const baseMatch = matchPlant(row.plant, plants, threshold);
    if (!baseMatch) {
      warnings.push(`⚠️ Could not match base plant "${row.plant}"`);
      continue;
    }

    console.log(`\n${row.plant} → ${baseMatch.matchedName} (${baseMatch.score.toFixed(2)})`);

    const processList = (items: string[], type: RelationshipType) => {
      for (const item of items) {
        const label = item.trim();
        if (!label) continue;

        const match = matchPlant(label, plants, threshold);
        const isSelf = match && match.record.id === baseMatch.record.id;
        if (isSelf) {
          warnings.push(`⚠️ Skipping self reference "${label}" for "${row.plant}"`);
        }

        const targetPlantId = match && !isSelf ? match.record.id : null;
        const displayName = match && !isSelf ? match.matchedName : label;
        const pendingRow: PendingRow = {
          plantId: baseMatch.record.id,
          targetPlantId,
          targetName: displayName,
          type,
        };

        const key = rowKey(pendingRow);
        if (existingKeys.has(key) || pendingKeys.has(key)) {
          continue;
        }

        pending.push(pendingRow);
        pendingKeys.add(key);

        if (!match || isSelf) {
          console.log(`  • ${label} → saved as text`);
          if (!match) {
            warnings.push(`⚠️ No database match for "${label}" (stored as text)`);
          }
        } else {
          console.log(`  ✓ ${label} → ${match.matchedName} (${match.score.toFixed(2)})`);
        }
      }
    };

    processList(row.bestCompanions, "companion");
    processList(row.worstCompanions, "antagonist");
  }

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`  ${warning}`);
    }
  }

  if (!pending.length) {
    console.log("\nNo new relationships to add.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\nPrepared ${pending.length} relationship rows.`);

  if (!commit) {
    console.log("Run again with --commit to insert them into the database.");
    await prisma.$disconnect();
    return;
  }

  await prisma.companion.createMany({
    data: pending.map((row) => ({
      plantId: row.plantId,
      targetPlantId: row.targetPlantId,
      targetName: row.targetName,
      type: row.type,
      reason: null,
    })),
    skipDuplicates: true,
  });

  console.log(`Inserted ${pending.length} rows into Companion table.`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

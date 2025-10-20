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

type PairKey = {
  first: PlantRecord;
  second: PlantRecord;
  type: RelationshipType;
  missing: {
    firstToSecond: boolean;
    secondToFirst: boolean;
  };
};

function canonicalKey(type: RelationshipType, aId: string, bId: string): string {
  return `${type}:${[aId, bId].sort().join("|")}`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const commit = args.has("--commit");
  const thresholdArg = Array.from(args).find((arg) => arg.startsWith("--threshold="));
  const threshold = thresholdArg ? Number(thresholdArg.split("=")[1]) || DEFAULT_THRESHOLD : DEFAULT_THRESHOLD;

  const [relationships, plants] = await Promise.all([loadRelationships(), loadPlants()]);

  const pending = new Map<string, PairKey>();
  const warnings: string[] = [];

  const existing = await prisma.companion.findMany({
    select: {
      plantAId: true,
      plantBId: true,
      type: true,
    },
  });
  const existingMap = new Map<string, Set<string>>();
  for (const entry of existing) {
    const key = canonicalKey(entry.type as RelationshipType, entry.plantAId, entry.plantBId);
    const orientationKey = `${entry.plantAId}->${entry.plantBId}`;
    if (!existingMap.has(key)) {
      existingMap.set(key, new Set([orientationKey]));
    } else {
      existingMap.get(key)!.add(orientationKey);
    }
  }

  for (const row of relationships) {
    const baseMatch = matchPlant(row.plant, plants, threshold);
    if (!baseMatch) {
      warnings.push(`⚠️ Could not match base plant "${row.plant}"`);
      continue;
    }

    console.log(`\n${row.plant} → ${baseMatch.matchedName} (${baseMatch.score.toFixed(2)})`);

    const processList = (items: string[], type: RelationshipType) => {
      for (const item of items) {
        const match = matchPlant(item, plants, threshold);
        if (!match) {
          warnings.push(`⚠️ ${type === "companion" ? "Companion" : "Antagonist"} for "${row.plant}" not matched: "${item}"`);
          continue;
        }
        if (match.record.id === baseMatch.record.id) {
          continue;
        }
        const key = canonicalKey(type, baseMatch.record.id, match.record.id);
        const existingOrientations = existingMap.get(key) ?? new Set<string>();
        const [first, second] = [baseMatch.record, match.record].sort((left, right) =>
          left.id.localeCompare(right.id),
        );
        const firstToSecondKey = `${first.id}->${second.id}`;
        const secondToFirstKey = `${second.id}->${first.id}`;
        const needsFirstToSecond = !existingOrientations.has(firstToSecondKey);
        const needsSecondToFirst = !existingOrientations.has(secondToFirstKey);

        if (!needsFirstToSecond && !needsSecondToFirst) {
          continue;
        }

        const current = pending.get(key);
        if (current) {
          current.missing.firstToSecond = current.missing.firstToSecond || needsFirstToSecond;
          current.missing.secondToFirst = current.missing.secondToFirst || needsSecondToFirst;
        } else {
          pending.set(key, {
            first,
            second,
            type,
            missing: {
              firstToSecond: needsFirstToSecond,
              secondToFirst: needsSecondToFirst,
            },
          });
        }

        console.log(`  ${type === "companion" ? "✓" : "✗"} ${item} → ${match.matchedName} (${match.score.toFixed(2)})`);
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

  if (!pending.size) {
    console.log("\nNo new relationships to add.");
    await prisma.$disconnect();
    return;
  }

  const preparedRows = Array.from(pending.values()).reduce((total, entry) => {
    return total + (entry.missing.firstToSecond ? 1 : 0) + (entry.missing.secondToFirst ? 1 : 0);
  }, 0);

  if (!preparedRows) {
    console.log("\nAll relationships already present; nothing to do.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\nPrepared ${pending.size} unique relationship pairs (${preparedRows} missing rows).`);

  if (!commit) {
    console.log("Run again with --commit to insert them into the database.");
    await prisma.$disconnect();
    return;
  }

  const rows = Array.from(pending.values()).flatMap(({ first, second, type, missing }) => {
    const reason = type === "companion" ? "Manual companion list" : "Manual antagonist list";
    const entries = [] as Array<{ plantAId: string; plantBId: string; type: RelationshipType; reason: string }>;
    if (missing.firstToSecond) {
      entries.push({ plantAId: first.id, plantBId: second.id, type, reason });
    }
    if (missing.secondToFirst) {
      entries.push({ plantAId: second.id, plantBId: first.id, type, reason });
    }
    return entries;
  });

  await prisma.companion.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`Inserted ${rows.length} rows into Companion table.`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});

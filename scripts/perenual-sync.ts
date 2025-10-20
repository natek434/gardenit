import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { perenualTargets } from "../data/perenual-targets";
import { persistPlantImage } from "./utils/image-store";
import {
  fallbackTitle,
  detectMissingFields,
  findSpecies,
  getPreferredImageUrl,
  getSpeciesDetail,
  toPlantPayload,
} from "./utils/perenual-api";

const prisma = new PrismaClient();
const LOG_PATH = path.resolve(process.cwd(), "data", "perenual-sync-log.json");
const API_KEY = process.env.PERENUAL_API_KEY;

enum LogCategory {
  MissingData = "missingData",
  ApiLimit = "apiLimit",
}

type LogEntry = {
  perenualId: number | null;
  reason: string;
  lastAttempt: string;
  attempts: number;
};

type SyncLog = {
  missingData: Record<string, LogEntry>;
  apiLimit: Record<string, LogEntry>;
};

type Summary = {
  complete: number;
  updated: string[];
  skipped: Array<{ name: string; reason: string }>;
  missingData: Array<{ name: string; reason: string }>;
  apiLimited: Array<{ name: string; reason: string }>;
};

function createEmptyLog(): SyncLog {
  return { missingData: {}, apiLimit: {} };
}

async function readLog(): Promise<SyncLog> {
  try {
    const raw = await fs.readFile(LOG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<SyncLog>;
    return {
      missingData: parsed.missingData ?? {},
      apiLimit: parsed.apiLimit ?? {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyLog();
    }
    throw error;
  }
}

async function writeLog(log: SyncLog): Promise<void> {
  const serialised = `${JSON.stringify(log, null, 2)}\n`;
  await fs.writeFile(LOG_PATH, serialised, "utf8");
}

function isSameDay(isoTimestamp: string): boolean {
  if (!isoTimestamp) return false;
  const today = new Date();
  const attempt = new Date(isoTimestamp);
  return (
    attempt.getFullYear() === today.getFullYear() &&
    attempt.getMonth() === today.getMonth() &&
    attempt.getDate() === today.getDate()
  );
}

function recordLogEntry(
  log: SyncLog,
  category: LogCategory,
  name: string,
  entry: Pick<LogEntry, "reason"> & Partial<Omit<LogEntry, "reason">>,
): LogEntry {
  const container = category === LogCategory.MissingData ? log.missingData : log.apiLimit;
  const previous = container[name];
  const next: LogEntry = {
    perenualId: entry.perenualId ?? previous?.perenualId ?? null,
    reason: entry.reason,
    lastAttempt: entry.lastAttempt ?? new Date().toISOString(),
    attempts: (previous?.attempts ?? 0) + 1,
  };
  container[name] = next;
  if (category === LogCategory.MissingData) {
    delete log.apiLimit[name];
  } else {
    delete log.missingData[name];
  }
  return next;
}

function clearLogEntries(log: SyncLog, name: string) {
  delete log.missingData[name];
  delete log.apiLimit[name];
}

function plantNeedsRefresh(plant: { perenualId: number | null; description: string | null } | null): boolean {
  if (!plant) return true;
  if (plant.perenualId == null) return true;
  return plant.description == null;
}

async function ensureImage(
  commonName: string,
  preferredUrl: string | undefined,
  detail: { default_image?: { original_url?: string | null; medium_url?: string | null } | null },
): Promise<string | null> {
  if (!preferredUrl) return null;
  return persistPlantImage({
    commonName,
    sourceUrl: preferredUrl,
    fileNameHint: detail.default_image?.original_url ?? detail.default_image?.medium_url ?? undefined,
  }).catch((error) => {
    console.warn(`Could not persist image for ${commonName}: ${error instanceof Error ? error.message : error}`);
    return null;
  });
}

async function main() {
  if (!API_KEY) {
    throw new Error("Missing PERENUAL_API_KEY. Set it in your environment to sync plant data.");
  }

  const log = await readLog();
  const summary: Summary = { complete: 0, updated: [], skipped: [], missingData: [], apiLimited: [] };

  for (const target of perenualTargets) {
    const existing = await prisma.plant.findFirst({
      where: { commonName: { equals: target.name, mode: "insensitive" } },
      select: { id: true, perenualId: true, description: true },
    });

    if (!plantNeedsRefresh(existing)) {
      clearLogEntries(log, target.name);
      summary.complete += 1;
      continue;
    }

    if (log.missingData[target.name]) {
      summary.missingData.push({ name: target.name, reason: log.missingData[target.name].reason });
      continue;
    }

    const apiLog = log.apiLimit[target.name];
    if (apiLog && isSameDay(apiLog.lastAttempt)) {
      summary.skipped.push({
        name: target.name,
        reason: `Skipped due to API limit recorded ${apiLog.lastAttempt}`,
      });
      continue;
    }

    try {
      const match = await findSpecies(target.name, API_KEY);
      if (!match) {
        const logged = recordLogEntry(log, LogCategory.MissingData, target.name, {
          perenualId: null,
          reason: "No species match",
        });
        summary.missingData.push({ name: target.name, reason: logged.reason });
        continue;
      }

      const detail = await getSpeciesDetail(match.id, API_KEY);
      const preferredImageUrl = getPreferredImageUrl(detail);
      const imageLocalPath = await ensureImage(
        detail.common_name ?? fallbackTitle(target.name),
        preferredImageUrl,
        { default_image: detail.default_image },
      );

      const missingFields = detectMissingFields(detail);

      const payload = toPlantPayload(detail, target.category, target.name, imageLocalPath);

      if (existing) {
        await prisma.plant.update({ where: { id: existing.id }, data: payload });
      } else {
        await prisma.plant.upsert({
          where: { perenualId: payload.perenualId ?? match.id },
          update: payload,
          create: payload,
        });
      }

      if (missingFields.length > 0) {
        const logged = recordLogEntry(log, LogCategory.MissingData, target.name, {
          perenualId: payload.perenualId ?? match.id,
          reason: `Missing fields from API: ${missingFields.join(", ")}`,
        });
        summary.missingData.push({ name: target.name, reason: logged.reason });
        continue;
      }

      clearLogEntries(log, target.name);
      summary.updated.push(target.name);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.error(`Failed to refresh ${target.name}: ${reason}`);
      if (/Request budget of/.test(reason)) {
        const logged = recordLogEntry(log, LogCategory.ApiLimit, target.name, {
          perenualId: existing?.perenualId ?? null,
          reason,
        });
        summary.apiLimited.push({ name: target.name, reason: logged.reason });
        break;
      }
      if (/\b429\b/.test(reason) || /rate limit/i.test(reason)) {
        const logged = recordLogEntry(log, LogCategory.ApiLimit, target.name, {
          perenualId: existing?.perenualId ?? null,
          reason,
        });
        summary.apiLimited.push({ name: target.name, reason: logged.reason });
        break;
      } else if (/\b404\b/.test(reason) || /No species match/i.test(reason)) {
        const logged = recordLogEntry(log, LogCategory.MissingData, target.name, {
          perenualId: existing?.perenualId ?? null,
          reason,
        });
        summary.missingData.push({ name: target.name, reason: logged.reason });
      } else {
        const logged = recordLogEntry(log, LogCategory.ApiLimit, target.name, {
          perenualId: existing?.perenualId ?? null,
          reason,
        });
        summary.apiLimited.push({ name: target.name, reason: logged.reason });
      }
    }
  }

  await writeLog(log);

  console.log(`Checked ${perenualTargets.length} Perenual targets.`);
  console.log(`${summary.complete} already had complete data.`);
  if (summary.updated.length) {
    console.log(`Fetched ${summary.updated.length} plant${summary.updated.length === 1 ? "" : "s"}: ${summary.updated.join(", ")}.`);
  }
  if (summary.skipped.length) {
    console.log("Skipped due to previous API limits:");
    for (const entry of summary.skipped) {
      console.log(` - ${entry.name}: ${entry.reason}`);
    }
  }
  if (summary.apiLimited.length) {
    console.log("Hit API limits during this run:");
    for (const entry of summary.apiLimited) {
      console.log(` - ${entry.name}: ${entry.reason}`);
    }
  }
  if (summary.missingData.length) {
    console.log("Missing data from Perenual:");
    for (const entry of summary.missingData) {
      console.log(` - ${entry.name}: ${entry.reason}`);
    }
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

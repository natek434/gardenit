import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { perenualTargets } from "../data/perenual-targets";
import { persistPlantImage } from "./utils/image-store";
import {
  fallbackTitle,
  findSpecies,
  getPreferredImageUrl,
  getSpeciesDetail,
  toPlantPayload,
} from "./utils/perenual-api";

const API_KEY = process.env.PERENUAL_API_KEY;

const prisma = new PrismaClient();

async function main() {
  if (!API_KEY) {
    throw new Error("Missing PERENUAL_API_KEY. Set it in your environment to import plant data.");
  }

  const failures: Array<{ name: string; reason: string }> = [];

  for (const target of perenualTargets) {
    try {
      const match = await findSpecies(target.name, API_KEY);
      if (!match) {
        failures.push({ name: target.name, reason: "No species match" });
        continue;
      }
      const detail = await getSpeciesDetail(match.id, API_KEY);
      const preferredImageUrl = getPreferredImageUrl(detail);

      const imageLocalPath = await persistPlantImage({
        commonName: detail.common_name ?? fallbackTitle(target.name),
        sourceUrl: preferredImageUrl,
        fileNameHint: detail.default_image?.original_url ?? detail.default_image?.medium_url ?? undefined,
      }).catch((error) => {
        console.warn(`Could not persist image for ${target.name}: ${error instanceof Error ? error.message : error}`);
        return null;
      });

      const payload = toPlantPayload(detail, target.category, target.name, imageLocalPath);

      await prisma.plant.upsert({
        where: { perenualId: payload.perenualId ?? match.id },
        update: payload,
        create: payload,
      });

      console.log(`Imported ${target.name} (matched ${detail.common_name ?? match.common_name ?? "unknown"})`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      failures.push({ name: target.name, reason });
      console.error(`Failed to import ${target.name}: ${reason}`);
    }
  }

  if (failures.length) {
    console.warn("\nThe following plants could not be imported:");
    for (const failure of failures) {
      console.warn(` - ${failure.name}: ${failure.reason}`);
    }
  } else {
    console.log("\nAll plants imported successfully!");
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

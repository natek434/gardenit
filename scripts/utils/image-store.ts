import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, copyFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const PLANT_IMAGE_DIR = path.resolve(process.cwd(), "public", "plants");

function normaliseSlug(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "plant";
}

function inferExtension(input?: string | null): string {
  if (!input) return ".jpg";
  const match = /\.([a-zA-Z0-9]{2,5})(?:\?|$)/.exec(input);
  if (match?.[1]) {
    const ext = match[1].toLowerCase();
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
      return `.${ext === "jpeg" ? "jpg" : ext}`;
    }
  }
  return ".jpg";
}

async function ensureDir() {
  await mkdir(PLANT_IMAGE_DIR, { recursive: true });
}

async function downloadFile(url: string, destination: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}): ${url}`);
  }
  const stream = createWriteStream(destination);
  await pipeline(response.body, stream);
}

export type PersistImageOptions = {
  commonName: string;
  sourceUrl?: string;
  localFile?: string;
  fileNameHint?: string;
};

export async function persistPlantImage({
  commonName,
  sourceUrl,
  localFile,
  fileNameHint,
}: PersistImageOptions): Promise<string | null> {
  if (!sourceUrl && !localFile) return null;

  await ensureDir();
  const slug = normaliseSlug(commonName);
  const reference = sourceUrl ?? localFile ?? slug;
  const hash = createHash("sha1").update(reference).digest("hex").slice(0, 8);
  const extension = inferExtension(fileNameHint ?? sourceUrl ?? localFile ?? undefined);
  const filename = `${slug}-${hash}${extension}`;
  const targetPath = path.resolve(PLANT_IMAGE_DIR, filename);

  if (localFile) {
    const resolved = path.isAbsolute(localFile) ? localFile : path.resolve(process.cwd(), localFile);
    try {
      await stat(resolved);
    } catch {
      throw new Error(`Local image not found at ${resolved}`);
    }
    await copyFile(resolved, targetPath);
  } else if (sourceUrl) {
    await downloadFile(sourceUrl, targetPath);
  }

  const relativePath = `/plants/${filename}`;

  try {
    await access(targetPath);
  } catch (error) {
    throw new Error(`Failed to store image at ${targetPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return relativePath;
}

import { Prisma } from "@prisma/client";

export type PerenualListItem = {
  id: number;
  common_name?: string | null;
  scientific_name?: string[] | null;
};

export type PerenualListResponse = {
  data?: PerenualListItem[];
};

export type PerenualImage = {
  image_id?: number | null;
  license?: number | null;
  license_name?: string | null;
  license_url?: string | null;
  original_url?: string | null;
  regular_url?: string | null;
  medium_url?: string | null;
  small_url?: string | null;
  thumbnail?: string | null;
};

export type PerenualDimensions = {
  type?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  unit?: string | null;
};

export type PerenualPlantDetail = {
  id: number;
  common_name?: string | null;
  scientific_name?: string[] | null;
  other_name?: string[] | null;
  family?: string | null;
  origin?: string | null;
  type?: string | null;
  dimensions?: PerenualDimensions | null;
  cycle?: string | null;
  watering?: string | null;
  sunlight?: string[] | string | null;
  soil?: string[] | string | null;
  watering_general_benchmark?: { value?: string | number | null; unit?: string | null } | null;
  plant_anatomy?: Array<{ part?: string | null; color?: string[] | null }> | null;
  pruning_month?: string[] | null;
  pruning_count?: { amount?: number | null; interval?: string | null } | null;
  seeds?: number | null;
  attracts?: string[] | null;
  propagation?: string[] | null;
  hardiness?: { min?: string | null; max?: string | null } | null;
  hardiness_location?: Record<string, unknown> | null;
  flowers?: boolean | null;
  flowering_season?: string | null;
  cones?: boolean | null;
  fruits?: boolean | null;
  edible_fruit?: boolean | null;
  fruiting_season?: string | null;
  harvest_season?: string | null;
  harvest_method?: string | null;
  leaf?: boolean | null;
  edible_leaf?: boolean | null;
  growth_rate?: string | null;
  maintenance?: string | null;
  medicinal?: boolean | null;
  poisonous_to_humans?: boolean | null;
  poisonous_to_pets?: boolean | null;
  drought_tolerant?: boolean | null;
  salt_tolerant?: boolean | null;
  thorny?: boolean | null;
  invasive?: boolean | null;
  rare?: boolean | null;
  tropical?: boolean | null;
  cuisine?: boolean | null;
  indoor?: boolean | null;
  care_level?: string | null;
  description?: string | null;
  pest_susceptibility?: string[] | null;
  default_image?: PerenualImage | null;
  other_images?: PerenualImage[] | null;
  xWateringQuality?: string[] | null;
  xWateringPeriod?: string[] | null;
  xWateringAvgVolumeRequirement?: Record<string, unknown> | null;
  xWateringDepthRequirement?: Record<string, unknown> | null;
  xWateringBasedTemperature?: Record<string, unknown> | null;
  xWateringPhLevel?: Record<string, unknown> | null;
  xSunlightDuration?: Record<string, unknown> | null;
  flowering?: boolean | null;
  fruiting?: boolean | null;
};

const API_BASE = "https://perenual.com/api/v2";

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return (await response.json()) as T;
}

export async function findSpecies(targetName: string, apiKey: string): Promise<PerenualListItem | null> {
  const url = new URL(`${API_BASE}/species-list`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", targetName);
  url.searchParams.set("page", "1");

  const list = await fetchJson<PerenualListResponse>(url);
  const data = list.data ?? [];
  if (data.length === 0) return null;
  const lower = targetName.toLowerCase();
  return (
    data.find((item) => item.common_name?.toLowerCase() === lower) ??
    data.find((item) => item.common_name?.toLowerCase().includes(lower)) ??
    data[0]
  );
}

export async function getSpeciesDetail(id: number, apiKey: string): Promise<PerenualPlantDetail> {
  const url = new URL(`${API_BASE}/species/details/${id}`);
  url.searchParams.set("key", apiKey);
  return fetchJson<PerenualPlantDetail>(url);
}

function normaliseArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry == null) return "";
        return String(entry).trim();
      })
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    return value.trim().length ? [value.trim()] : [];
  }
  return [];
}

function summarise(text?: string | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.length > 280 ? `${trimmed.slice(0, 277)}...` : trimmed;
}

function toTitleCase(value: string): string {
  if (!value) return value;
  const lowered = value.toLowerCase();
  const capitalised = lowered.replace(/(^|[\s\-\/\(\)\[\]'’])([a-z])/g, (_match, boundary, char) => `${boundary}${char.toUpperCase()}`);
  return capitalised.replace(/\s+/g, " ").trim();
}

export function fallbackTitle(name: string): string {
  return toTitleCase(name);
}

export function toPlantPayload(
  detail: PerenualPlantDetail,
  category: "vegetable" | "herb" | "fruit",
  fallbackName: string,
  imageLocalPath: string | null,
): Prisma.PlantUncheckedCreateInput {
  const sunlightList = normaliseArray(detail.sunlight);
  const soilList = normaliseArray(detail.soil);
  const otherNames = normaliseArray(detail.other_name).map(toTitleCase);
  const attracts = normaliseArray(detail.attracts);
  const propagation = normaliseArray(detail.propagation);
  const pruningMonth = normaliseArray(detail.pruning_month);
  const wateringQuality = normaliseArray(detail.xWateringQuality);
  const wateringPeriod = normaliseArray(detail.xWateringPeriod);

  return {
    perenualId: detail.id,
    commonName: toTitleCase(detail.common_name ?? fallbackName),
    scientificName: detail.scientific_name?.filter(Boolean).join(", ") ?? null,
    otherNames,
    family: detail.family ?? null,
    origin: detail.origin ?? null,
    plantType: detail.type ?? null,
    category,
    cycle: detail.cycle ?? null,
    sunRequirement: sunlightList.length ? sunlightList.join(", ") : "Not specified",
    sunlightExposure: sunlightList,
    soilNotes: soilList.length ? soilList.join(", ") : null,
    soilPreferences: soilList,
    waterGeneral: detail.watering ?? "Not specified",
    watering: detail.watering ?? null,
    wateringGeneralBenchmark: detail.watering_general_benchmark ?? null,
    plantAnatomy: detail.plant_anatomy ?? null,
    pruningMonth,
    pruningCount: detail.pruning_count ?? null,
    seeds: detail.seeds ?? null,
    attracts,
    propagationMethods: propagation,
    hardinessMin: detail.hardiness?.min ?? null,
    hardinessMax: detail.hardiness?.max ?? null,
    hardinessLocation: detail.hardiness_location ?? null,
    flowers: detail.flowers ?? null,
    floweringSeason: detail.flowering_season ?? null,
    cones: detail.cones ?? null,
    fruits: detail.fruits ?? null,
    edibleFruit: detail.edible_fruit ?? null,
    fruitingSeason: detail.fruiting_season ?? null,
    harvestSeason: detail.harvest_season ?? null,
    harvestMethod: detail.harvest_method ?? null,
    leaf: detail.leaf ?? null,
    edibleLeaf: detail.edible_leaf ?? null,
    daysToMaturity: null,
    growthRate: detail.growth_rate ?? null,
    maintenanceLevel: detail.maintenance ?? null,
    medicinal: detail.medicinal ?? null,
    poisonousToHumans: detail.poisonous_to_humans ?? null,
    poisonousToPets: detail.poisonous_to_pets ?? null,
    droughtTolerant: detail.drought_tolerant ?? null,
    saltTolerant: detail.salt_tolerant ?? null,
    thorny: detail.thorny ?? null,
    invasive: detail.invasive ?? null,
    rare: detail.rare ?? null,
    tropical: detail.tropical ?? null,
    cuisine: detail.cuisine ?? null,
    indoor: detail.indoor ?? null,
    careLevel: detail.care_level ?? null,
    careNotes: summarise(detail.description),
    description: detail.description ?? null,
    defaultImage: detail.default_image
      ? { ...detail.default_image, localPath: imageLocalPath ?? undefined }
      : imageLocalPath
        ? { localPath: imageLocalPath }
        : null,
    otherImages: detail.other_images ?? null,
    imageLocalPath,
    wateringQuality,
    wateringPeriod,
    wateringAvgVolume: detail.xWateringAvgVolumeRequirement ?? null,
    wateringDepth: detail.xWateringDepthRequirement ?? null,
    wateringBasedTemperature: detail.xWateringBasedTemperature ?? null,
    wateringPhLevel: detail.xWateringPhLevel ?? null,
    sunlightDuration: detail.xSunlightDuration ?? null,
    sowDepthMm: null,
    spacingInRowCm: null,
    spacingBetweenRowsCm: null,
  };
}

export function getPreferredImageUrl(detail: PerenualPlantDetail): string | undefined {
  return (
    detail.default_image?.thumbnail ??
    detail.default_image?.small_url ??
    detail.default_image?.medium_url ??
    detail.default_image?.regular_url ??
    detail.default_image?.original_url ??
    undefined
  );
}

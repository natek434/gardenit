import Link from "next/link";
import classNames from "classnames";
import { PlantWithStatus } from "@/src/server/plant-service";
import { Badge } from "../ui/badge";
import { SunGlyph, WaterGlyph, FlowerGlyph, ThornGlyph, EdibleGlyph, CautionGlyph } from "./icons";

const statusToBadge: Record<string, { variant: Parameters<typeof Badge>[0]["variant"]; label: string }> = {
  NOW: { variant: "success", label: "Plant now" },
  COMING_SOON: { variant: "warning", label: "Coming soon" },
  TOO_LATE: { variant: "danger", label: "Too late" },
};

export function PlantCard({ plant }: { plant: PlantWithStatus }) {
  const status = statusToBadge[plant.status.status];
  const thumbnailUrl = plant.imageLocalPath ?? resolvePlantImage(plant.defaultImage);
  const wateringRating = deriveWateringRating(plant);
  const sunlightRating = deriveSunRating(plant);
  const features = buildFeatures(plant);
  return (
    <Link
      href={`/plants/${plant.id}`}
      className="flex h-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-slate-100">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={plant.commonName} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-200 text-2xl font-semibold text-slate-500">
            {plant.commonName.charAt(0) || "?"}
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{plant.commonName}</h3>
          <p className="text-xs italic text-slate-500">{plant.scientificName ?? "Scientific name pending"}</p>
        </div>
        {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
      </div>
      {plant.description ? (
        <p className="line-clamp-3 text-sm text-slate-600">{plant.description}</p>
      ) : (
        <p className="text-sm text-slate-500">We&apos;ll add a description for this plant soon.</p>
      )}
      <div className="space-y-2 text-xs text-slate-500">
        <RatingRow icon="sun" label="Sunlight" rating={sunlightRating} />
        <RatingRow icon="water" label="Water" rating={wateringRating} />
      </div>
      <div className="mt-auto flex flex-wrap gap-3 text-xs">
        {features.map((feature) => (
          <FeaturePill key={feature.label} {...feature} />
        ))}
      </div>
    </Link>
  );
}

function RatingRow({ icon, rating, label }: { icon: "sun" | "water"; rating: number; label: string }) {
  const Glyph = icon === "sun" ? SunGlyph : WaterGlyph;
  return (
    <div className="flex items-center gap-2" aria-label={`${label}: ${rating} of 5`}>
      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Glyph key={index} active={index < rating} />
        ))}
      </div>
    </div>
  );
}

type FeatureDescriptor = {
  label: string;
  active: boolean;
  icon: "flower" | "thorn" | "edible" | "caution";
  note?: string;
};

function FeaturePill({ label, active, icon, note }: FeatureDescriptor) {
  const IconComponent =
    icon === "flower" ? FlowerGlyph : icon === "thorn" ? ThornGlyph : icon === "edible" ? EdibleGlyph : CautionGlyph;
  return (
    <span
      className={classNames("inline-flex items-center gap-1 rounded-full border px-2 py-1", {
        "border-slate-300 bg-slate-100 text-slate-600": !active,
        "border-primary/30 bg-primary/10 text-primary": active,
      })}
      aria-label={`${label}${note ? `: ${note}` : ""}`}
    >
      <IconComponent active={active} />
      <span>
        {label}
        {active && note ? ` (${note})` : ""}
      </span>
    </span>
  );
}

function buildFeatures(plant: PlantWithStatus): FeatureDescriptor[] {
  return [
    { label: "Flowering", active: Boolean(plant.flowers), icon: "flower" },
    {
      label: "Edible",
      active: Boolean(plant.edibleFruit || plant.edibleLeaf),
      icon: "edible",
      note: plant.edibleFruit && plant.edibleLeaf ? "fruit & leaf" : plant.edibleFruit ? "fruit" : plant.edibleLeaf ? "leaf" : undefined,
    },
    { label: "Thorny", active: Boolean(plant.thorny), icon: "thorn" },
    {
      label: "Caution",
      active: Boolean(plant.poisonousToHumans || plant.poisonousToPets),
      icon: "caution",
      note: plant.poisonousToHumans
        ? plant.poisonousToPets
          ? "humans & pets"
          : "humans"
        : plant.poisonousToPets
          ? "pets"
          : undefined,
    },
  ];
}

function deriveWateringRating(plant: PlantWithStatus): number {
  const descriptor = (plant.watering ?? plant.waterGeneral ?? "").toLowerCase();
  const map: Array<{ match: RegExp; value: number }> = [
    { match: /none|dry/, value: 1 },
    { match: /light|minimum|low|drought/, value: 2 },
    { match: /average|moderate|medium/, value: 3 },
    { match: /regular|ample|moist|frequent/, value: 4 },
    { match: /heavy|daily|waterlogged|constant/, value: 5 },
  ];
  for (const entry of map) {
    if (entry.match.test(descriptor)) {
      return entry.value;
    }
  }
  return 3;
}

function deriveSunRating(plant: PlantWithStatus): number {
  const exposures = plant.sunlightExposure.length ? plant.sunlightExposure : [plant.sunRequirement ?? ""];
  const normalized = exposures.map((exposure) => exposure.toLowerCase());
  let rating = 1;
  for (const value of normalized) {
    if (value.includes("full") && value.includes("sun")) {
      rating = Math.max(rating, 5);
    } else if (value.includes("part") && value.includes("sun")) {
      rating = Math.max(rating, 4);
    } else if (value.includes("part") && value.includes("shade")) {
      rating = Math.max(rating, 3);
    } else if (value.includes("filtered") || value.includes("dappled")) {
      rating = Math.max(rating, 3);
    } else if (value.includes("shade")) {
      rating = Math.max(rating, 2);
    }
  }
  if (!normalized.join("").trim()) {
    return 3;
  }
  return rating;
}

function resolvePlantImage(image: PlantWithStatus["defaultImage"]): string | null {
  if (!image || typeof image !== "object") return null;
  const record = image as Record<string, unknown>;
  const candidates = ["thumbnail", "small_url", "medium_url", "regular_url", "original_url"];
  for (const key of candidates) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

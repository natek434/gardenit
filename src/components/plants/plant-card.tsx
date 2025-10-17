import Link from "next/link";
import { PlantWithStatus } from "@/src/server/plant-service";
import { Badge } from "../ui/badge";

const statusToBadge: Record<string, { variant: Parameters<typeof Badge>[0]["variant"]; label: string }> = {
  NOW: { variant: "success", label: "Sow now" },
  COMING_SOON: { variant: "warning", label: "Coming soon" },
  TOO_LATE: { variant: "danger", label: "Too late" },
};

export function PlantCard({ plant }: { plant: PlantWithStatus }) {
  const status = statusToBadge[plant.status.status];
  const thumbnailUrl = resolvePlantImage(plant.defaultImage);
  return (
    <Link
      href={`/plants/${plant.id}`}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
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
        <h3 className="text-lg font-semibold text-slate-800">{plant.commonName}</h3>
        {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
      </div>
      <p className="text-sm text-slate-600">{plant.waterGeneral}</p>
      <div className="space-y-1 text-xs text-slate-500">
        <p>Sun: {plant.sunlightExposure.length ? plant.sunlightExposure.join(", ") : plant.sunRequirement}</p>
        <p>Watering: {plant.watering ?? plant.waterGeneral}</p>
        <p>Days to maturity: {plant.daysToMaturity ?? "--"}</p>
      </div>
    </Link>
  );
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

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
  return (
    <Link
      href={`/plants/${plant.id}`}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{plant.commonName}</h3>
        {status ? <Badge variant={status.variant}>{status.label}</Badge> : null}
      </div>
      <p className="text-sm text-slate-600">{plant.waterGeneral}</p>
      <div className="text-xs text-slate-500 space-y-1">
        <p>Sun: {plant.sunlightExposure.length ? plant.sunlightExposure.join(", ") : plant.sunRequirement}</p>
        <p>Watering: {plant.watering ?? plant.waterGeneral}</p>
        <p>Days to maturity: {plant.daysToMaturity ?? "--"}</p>
      </div>
    </Link>
  );
}

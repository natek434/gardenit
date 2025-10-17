import { PlantWithRelations } from "@/src/server/plant-service";
import { Badge } from "../ui/badge";

export function PlantDetail({ plant }: { plant: PlantWithRelations }) {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{plant.commonName}</h1>
            <p className="text-sm text-slate-500">{plant.scientificName}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="muted">{plant.category}</Badge>
            <Badge variant="muted">Sun: {plant.sunRequirement}</Badge>
          </div>
        </div>
        <p className="mt-4 text-slate-600">{plant.careNotes}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard title="Spacing" value={`${plant.spacingInRowCm ?? "--"}cm in-row`} helper={`Rows ${plant.spacingBetweenRowsCm ?? "--"}cm apart`} />
        <InfoCard title="Water" value={plant.waterGeneral} />
        <InfoCard title="Days to maturity" value={plant.daysToMaturity ? `${plant.daysToMaturity} days` : "--"} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Planting windows"
          value={formatWindows(plant.climateWindows)}
          helper="Months inclusive, based on your selected zone."
        />
        <RelationCard title="Companions" relationships={plant.companions}
          empty="No companions listed." />
        <RelationCard title="Antagonists" relationships={plant.antagonists}
          variant="danger" empty="No antagonists listed." />
      </section>
    </div>
  );
}

type InfoCardProps = {
  title: string;
  value: string;
  helper?: string;
};

function InfoCard({ title, value, helper }: InfoCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
      <p className="mt-2 text-lg text-slate-800">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

type RelationCardProps = {
  title: string;
  relationships: Array<{ plantB: { commonName: string }; reason: string | null }>;
  empty: string;
  variant?: Parameters<typeof Badge>[0]["variant"];
};

function RelationCard({ title, relationships, empty, variant = "success" }: RelationCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
      <div className="mt-3 space-y-3">
        {relationships.length === 0 ? (
          <p className="text-sm text-slate-500">{empty}</p>
        ) : (
          relationships.map((relationship) => (
            <div key={relationship.plantB.commonName} className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-700">{relationship.plantB.commonName}</p>
                {relationship.reason ? (
                  <p className="text-xs text-slate-500">{relationship.reason}</p>
                ) : null}
              </div>
              <Badge variant={variant}>{title}</Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatWindows(
  windows: PlantWithRelations["climateWindows"],
): string {
  if (!windows.length) {
    return "No calendar data available";
  }
  const first = windows[0];
  const formatRange = (range?: Array<{ start: number; end: number }> | null, label?: string) => {
    if (!range?.length) return null;
    const values = range
      .map(({ start, end }) => `${monthName(start)}-${monthName(end)}`)
      .join(", ");
    return `${label}: ${values}`;
  };
  return [
    formatRange(first.sowOutdoors as Array<{ start: number; end: number }> | null, "Outdoors"),
    formatRange(first.sowIndoors as Array<{ start: number; end: number }> | null, "Indoors"),
    formatRange(first.transplant as Array<{ start: number; end: number }> | null, "Transplant"),
  ]
    .filter(Boolean)
    .join(" • ");
}

function monthName(month: number) {
  return new Date(2000, month - 1, 1).toLocaleString("en-NZ", { month: "short" });
}

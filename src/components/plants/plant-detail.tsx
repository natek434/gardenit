import { PlantWithRelations } from "@/src/server/plant-service";
import { Badge } from "../ui/badge";

type PlantImage = {
  original_url?: string;
  regular_url?: string;
  medium_url?: string;
  small_url?: string;
  thumbnail?: string;
};

export function PlantDetail({ plant }: { plant: PlantWithRelations }) {
  const defaultImage = (plant.defaultImage as PlantImage | (PlantImage & { localPath?: string }) | null) ?? null;
  const defaultImageUrl =
    plant.imageLocalPath ??
    defaultImage?.medium_url ??
    defaultImage?.regular_url ??
    defaultImage?.small_url ??
    (defaultImage as { localPath?: string } | null)?.localPath ??
    undefined;
  const otherNames = plant.otherNames.filter(Boolean);

  const quickFacts: Array<{ title: string; value: string }> = [
    { title: "Sunlight", value: formatList(plant.sunlightExposure, plant.sunRequirement) },
    { title: "Watering", value: plant.watering ?? plant.waterGeneral },
    { title: "Soil preferences", value: formatList(plant.soilPreferences, plant.soilNotes) },
    {
      title: "Hardiness",
      value:
        plant.hardinessMin || plant.hardinessMax
          ? `Zones ${plant.hardinessMin ?? "?"}-${plant.hardinessMax ?? "?"}`
          : "Not specified",
    },
    { title: "Propagation", value: formatList(plant.propagationMethods) },
    { title: "Attracts", value: formatList(plant.attracts) },
    { title: "Growth rate", value: plant.growthRate ?? "Not specified" },
    { title: "Maintenance", value: plant.maintenanceLevel ?? plant.careLevel ?? "Not specified" },
    { title: "Medicinal", value: formatBoolean(plant.medicinal) },
    { title: "Edible fruit", value: formatBoolean(plant.edibleFruit) },
    { title: "Edible leaf", value: formatBoolean(plant.edibleLeaf) },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {defaultImageUrl ? (
          <div className="relative h-64 w-full bg-slate-100">
            <img src={defaultImageUrl} alt={plant.commonName} className="h-full w-full object-cover" loading="lazy" />
          </div>
        ) : null}
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{plant.commonName}</h1>
              <p className="text-sm text-slate-500">{plant.scientificName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="muted">{plant.category}</Badge>
              {plant.cycle ? <Badge variant="muted">{plant.cycle}</Badge> : null}
              {plant.careLevel ? <Badge variant="muted">Care: {plant.careLevel}</Badge> : null}
            </div>
          </div>
          {otherNames.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wide text-slate-600">Also known as</span>
              {otherNames.map((name) => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))}
            </div>
          ) : null}
          {plant.description ? <p className="text-slate-600">{plant.description}</p> : null}
          {plant.careNotes ? <p className="text-sm text-slate-500">{plant.careNotes}</p> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard title="Spacing" value={`${plant.spacingInRowCm ?? "--"}cm in-row`} helper={`Rows ${plant.spacingBetweenRowsCm ?? "--"}cm apart`} />
        <InfoCard title="Water" value={plant.waterGeneral} />
        <InfoCard title="Days to maturity" value={plant.daysToMaturity ? `${plant.daysToMaturity} days` : "--"} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {quickFacts.map((fact) => (
          <InfoCard key={fact.title} title={fact.title} value={fact.value} />
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard
          title="Planting windows"
          value={formatWindows(plant.climateWindows)}
          helper="Months inclusive, based on your selected zone."
        />
        <RelationCard title="Companions" relationships={plant.companions} empty="No companions listed." />
        <RelationCard title="Antagonists" relationships={plant.antagonists} variant="danger" empty="No antagonists listed." />
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

function formatWindows(windows: PlantWithRelations["climateWindows"]): string {
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

function formatList(values: string[], fallback?: string | null) {
  if (values?.length) {
    return values.join(", ");
  }
  if (fallback) return fallback;
  return "Not specified";
}

function formatBoolean(value?: boolean | null) {
  if (value === undefined || value === null) return "Not specified";
  return value ? "Yes" : "No";
}

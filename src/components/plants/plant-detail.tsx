import Link from "next/link";
import { ReactNode } from "react";
import { propagationSlug } from "@/src/lib/propagation";
import { PlantWithRelations } from "@/src/server/plant-service";
import { FocusToggle } from "@/src/components/focus/focus-toggle";
import { Badge } from "../ui/badge";
import { PlantActions } from "./plant-actions";

type PlantImage = {
  original_url?: string;
  regular_url?: string;
  medium_url?: string;
  small_url?: string;
  thumbnail?: string;
};

export function PlantDetail({
  plant,
  collections,
  focusId,
}: {
  plant: PlantWithRelations;
  collections?: Array<{ id: string; name: string }>;
  focusId?: string | null;
}) {
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
    <div className="space-y-6" id="top">
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
            <div className="flex flex-wrap items-center gap-3">
              <FocusToggle
                kind="plant"
                targetId={plant.id}
                initialFocusId={focusId ?? undefined}
                label={plant.commonName}
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="muted">{plant.category}</Badge>
                {plant.cycle ? <Badge variant="muted">{plant.cycle}</Badge> : null}
                {plant.careLevel ? <Badge variant="muted">Care: {plant.careLevel}</Badge> : null}
              </div>
            </div>
          </div>
          {collections ? (
            collections.length ? (
              <PlantActions plantId={plant.id} collections={collections} />
            ) : (
              <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                You don&apos;t have any collections yet. Create one on the{" "}
                <Link href="/plants/collection" className="font-semibold text-primary hover:underline">
                  collections page
                </Link>
                .
              </div>
            )
          ) : null}
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

      <AttributeGroups plant={plant} />

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
  relationships: Array<{ targetName: string; targetPlant: { id: string; commonName: string } | null; reason: string | null }>;
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
            <div
              key={`${relationship.targetPlant?.id ?? relationship.targetName}-${relationship.targetName}`}
              className="flex items-start justify-between gap-4"
            >
              <div>
                <p className="font-medium text-slate-700">
                  {relationship.targetPlant ? (
                    <Link
                      href={`/plants/${relationship.targetPlant.id}`}
                      className="text-primary hover:underline"
                    >
                      {relationship.targetPlant.commonName}
                    </Link>
                  ) : (
                    relationship.targetName
                  )}
                </p>
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

type AttributeItem = {
  label: string;
  value: unknown;
  render?: () => ReactNode;
};

type AttributeGroup = {
  title: string;
  description?: string;
  items: AttributeItem[];
};

function AttributeGroups({ plant }: { plant: PlantWithRelations }) {
  const groups = buildAttributeGroups(plant);
  return (
    <section className="space-y-4">
      {groups.map((group, index) => (
        <details
          key={group.title}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          open={index < 2}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3">
            <span className="text-sm font-semibold text-slate-600">{group.title}</span>
            <span className="text-xs text-slate-400">{group.items.length} fields</span>
          </summary>
          <div className="space-y-3 px-4 pb-4">
            {group.description ? <p className="text-xs text-slate-500">{group.description}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <div key={`${group.title}-${item.label}`} className="rounded border border-slate-100 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                  <div className="mt-1 text-sm text-slate-700">{renderAttribute(item)}</div>
                </div>
              ))}
            </div>
          </div>
        </details>
      ))}
    </section>
  );
}

function renderAttribute(item: AttributeItem): ReactNode {
  if (item.render) {
    return item.render();
  }
  return renderValue(item.value);
}

function buildAttributeGroups(plant: PlantWithRelations): AttributeGroup[] {
  return [
    {
      title: "Identity & classification",
      items: [
        { label: "Perenual ID", value: plant.perenualId },
        { label: "Common name", value: plant.commonName },
        { label: "Scientific name", value: plant.scientificName },
        { label: "Other names", value: plant.otherNames },
        { label: "Family", value: plant.family },
        { label: "Origin", value: plant.origin },
        { label: "Plant type", value: plant.plantType },
        { label: "Category", value: plant.category },
        { label: "Life cycle", value: plant.cycle },
        { label: "Description", value: plant.description },
      ],
    },
    {
      title: "Light & soil",
      items: [
        { label: "Sun requirement", value: plant.sunRequirement },
        { label: "Sunlight exposure", value: plant.sunlightExposure },
        { label: "Soil notes", value: plant.soilNotes },
        { label: "Soil preferences", value: plant.soilPreferences },
      ],
    },
    {
      title: "Water & environment",
      items: [
        { label: "Water guidance", value: plant.waterGeneral },
        { label: "Watering schedule", value: plant.watering },
        { label: "Water benchmark", value: plant.wateringGeneralBenchmark },
        { label: "Water quality notes", value: plant.wateringQuality },
        { label: "Watering period", value: plant.wateringPeriod },
        { label: "Average volume", value: plant.wateringAvgVolume },
        { label: "Watering depth", value: plant.wateringDepth },
        { label: "Temperature-based watering", value: plant.wateringBasedTemperature },
        { label: "Water pH range", value: plant.wateringPhLevel },
        { label: "Sunlight duration data", value: plant.sunlightDuration },
      ],
    },
    {
      title: "Growth & care",
      items: [
        { label: "Growth rate", value: plant.growthRate },
        { label: "Maintenance level", value: plant.maintenanceLevel },
        { label: "Care level", value: plant.careLevel },
        { label: "Care notes", value: plant.careNotes },
        { label: "Days to maturity", value: plant.daysToMaturity },
        { label: "Sowing depth (mm)", value: plant.sowDepthMm },
        { label: "In-row spacing (cm)", value: plant.spacingInRowCm },
        { label: "Row spacing (cm)", value: plant.spacingBetweenRowsCm },
        { label: "Seed count", value: plant.seeds },
        { label: "Pruning months", value: plant.pruningMonth },
        { label: "Pruning frequency", value: plant.pruningCount },
        {
          label: "Propagation methods",
          value: plant.propagationMethods,
          render: () => renderPropagationList(plant.propagationMethods),
        },
        { label: "Attracts", value: plant.attracts },
        { label: "Plant anatomy", value: plant.plantAnatomy },
      ],
    },
    {
      title: "Seasonal traits",
      items: [
        { label: "Produces flowers", value: plant.flowers },
        { label: "Flowering season", value: plant.floweringSeason },
        { label: "Produces cones", value: plant.cones },
        { label: "Produces fruit", value: plant.fruits },
        { label: "Edible fruit", value: plant.edibleFruit },
        { label: "Fruiting season", value: plant.fruitingSeason },
        { label: "Harvest season", value: plant.harvestSeason },
        { label: "Harvest method", value: plant.harvestMethod },
        { label: "Leafy", value: plant.leaf },
        { label: "Edible leaf", value: plant.edibleLeaf },
      ],
    },
    {
      title: "Resilience & usage",
      items: [
        { label: "Medicinal", value: plant.medicinal },
        { label: "Poisonous to humans", value: plant.poisonousToHumans },
        { label: "Poisonous to pets", value: plant.poisonousToPets },
        { label: "Drought tolerant", value: plant.droughtTolerant },
        { label: "Salt tolerant", value: plant.saltTolerant },
        { label: "Thorny", value: plant.thorny },
        { label: "Invasive", value: plant.invasive },
        { label: "Rare", value: plant.rare },
        { label: "Tropical", value: plant.tropical },
        { label: "Used in cuisine", value: plant.cuisine },
        { label: "Suitable indoors", value: plant.indoor },
        { label: "Diseases & pests", value: plant.diseases },
      ],
    },
    {
      title: "Hardiness & mapping",
      items: [
        { label: "Hardiness minimum", value: plant.hardinessMin },
        { label: "Hardiness maximum", value: plant.hardinessMax },
        { label: "Hardiness location data", value: plant.hardinessLocation },
      ],
    },
    {
      title: "Media assets",
      items: [
        { label: "Default image payload", value: plant.defaultImage },
        { label: "Other images", value: plant.otherImages },
        { label: "Stored image path", value: plant.imageLocalPath },
      ],
    },
    {
      title: "Record metadata",
      items: [
        { label: "Created at", value: plant.createdAt },
        { label: "Updated at", value: plant.updatedAt },
      ],
    },
  ];
}

function renderPropagationList(methods: string[]): ReactNode {
  if (!methods || methods.length === 0) {
    return <span className="text-slate-400">Not specified</span>;
  }
  return (
    <ul className="space-y-1">
      {methods.map((method) => {
        const slug = propagationSlug(method);
        return (
          <li key={method}>
            <Link href={`/docs/propagation#${slug}`} className="text-primary hover:underline">
              {method}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">Not specified</span>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : <span className="text-slate-400">Not specified</span>;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toString() : <span className="text-slate-400">Not specified</span>;
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value instanceof Date) {
    return formatDate(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-slate-400">Not specified</span>;
    }
    return (
      <ul className="list-disc space-y-1 pl-5">
        {value.map((entry, index) => (
          <li key={index}>{typeof entry === "string" ? entry : renderValue(entry)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    try {
      return (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    } catch (error) {
      return <span className="text-slate-400">Not specified</span>;
    }
  }
  return <span className="text-slate-400">Not specified</span>;
}

function formatDate(value: Date): string {
  return value.toLocaleString("en-NZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

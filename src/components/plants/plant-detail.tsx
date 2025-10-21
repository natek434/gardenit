import Link from "next/link";
import { ReactNode } from "react";
import classNames from "classnames";
import {
  CalendarClock,
  ChefHat,
  House,
  Pill,
  Skull,
  Sprout,
  ThermometerSun,
  Utensils,
  Wrench,
  Droplet,
  Sun
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  // localPath is only present when we've cached it
  localPath?: string;
};

type FactTone = "default" | "success" | "warning" | "danger";

type QuickFact = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone?: FactTone;
};

const factToneStyles: Record<FactTone, { icon: string; border: string; value: string }> = {
  default: {
    icon: "bg-slate-100 text-slate-600",
    border: "border-slate-200",
    value: "text-slate-700",
  },
  success: {
    icon: "bg-emerald-100 text-emerald-700",
    border: "border-emerald-200",
    value: "text-emerald-700",
  },
  warning: {
    icon: "bg-amber-100 text-amber-700",
    border: "border-amber-200",
    value: "text-amber-700",
  },
  danger: {
    icon: "bg-rose-100 text-rose-700",
    border: "border-rose-200",
    value: "text-rose-700",
  },
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
  const defaultImage = (plant.defaultImage as PlantImage | null) ?? null;

  const defaultImageUrl =
    plant.imageLocalPath ??
    defaultImage?.medium_url ??
    defaultImage?.regular_url ??
    defaultImage?.small_url ??
    defaultImage?.localPath ??
    undefined;

  const otherNames = (plant.otherNames ?? []).filter(Boolean) as string[];

  const edibleInfo = deriveEdibleInfo(plant);
  const toxicityInfo = deriveToxicityInfo(plant.poisonousToHumans, plant.poisonousToPets);
  const medicinalInfo = describeBoolean(plant.medicinal, "Medicinal uses noted", "No recorded medicinal use");
  const culinaryInfo = describeBoolean(plant.cuisine, "Popular in the kitchen", "Limited culinary use");
  const indoorInfo = describeBoolean(plant.indoor, "Happy indoors", "Prefers outdoor growing");
  const maintenanceSource = plant.maintenanceLevel ?? plant.careLevel ?? null;
  const maintenanceValue = formatDescriptor(maintenanceSource ?? undefined);
  const maintenanceTone = deriveMaintenanceTone(maintenanceSource);

  const quickFacts: QuickFact[] = [
    { title: "Spacing", value: `${plant.spacingInRowCm ?? "--"}cm in-row`, icon: Sprout},
    { title: "Water", value: plant.waterGeneral ?? "Not specified", icon: Droplet },
    { title: "Sunlight", value: plant.sunRequirement ?? "Not specified", icon: Sun },
    { title: "Hardiness", value: formatHardiness(plant.hardinessMin, plant.hardinessMax), icon: ThermometerSun },
    {
      title: "Days to maturity",
      value: plant.daysToMaturity ? `${plant.daysToMaturity} days` : "Not specified",
      icon: CalendarClock,
    },
    { title: "Growth rate", value: formatDescriptor(plant.growthRate), icon: Sprout },
    { title: "Maintenance", value: maintenanceValue, icon: Wrench, tone: maintenanceTone },
    { title: "Edible uses", value: edibleInfo.label, icon: Utensils, tone: edibleInfo.tone },
    { title: "Medicinal", value: medicinalInfo.label, icon: Pill, tone: medicinalInfo.tone },
    { title: "Culinary use", value: culinaryInfo.label, icon: ChefHat, tone: culinaryInfo.tone },
    { title: "Indoor friendly", value: indoorInfo.label, icon: House, tone: indoorInfo.tone },
    { title: "Toxicity", value: toxicityInfo.label, icon: Skull, tone: toxicityInfo.tone },
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
                {plant.category ? <Badge variant="muted">{plant.category}</Badge> : null}
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

      <QuickFactGrid facts={quickFacts} />

      <AttributeGroups plant={plant} />

      <section className="grid gap-4 md:grid-cols-2">
        <RelationCard
          title="Companions"
          relationships={plant.companions ?? []}
          empty="No companions listed."
        />
        <RelationCard
          title="Antagonists"
          relationships={plant.antagonists ?? []}
          variant="destructive"
          empty="No antagonists listed."
        />
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

function QuickFactGrid({ facts }: { facts: QuickFact[] }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {facts.map((fact) => (
        <QuickFactCard key={fact.title} {...fact} />
      ))}
    </section>
  );
}

function QuickFactCard({ title, value, icon: Icon, tone = "default" }: QuickFact) {
  const toneStyles = factToneStyles[tone];
  return (
    <div className={classNames("rounded-lg border bg-white p-4 shadow-sm", toneStyles.border)}>
      <div className="flex items-start gap-3">
        <span
          className={classNames(
            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
            toneStyles.icon,
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className={classNames("mt-1 text-sm font-medium", toneStyles.value)}>{value}</p>
        </div>
      </div>
    </div>
  );
}

type RelationCardProps = {
  title: string;
  relationships: Array<{
    targetName: string;
    targetPlant: { id: string; commonName: string } | null;
    reason: string | null;
  }>;
  empty: string;
  variant?: React.ComponentProps<typeof Badge>["variant"];
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
                    <Link href={`/plants/${relationship.targetPlant.id}`} className="text-primary hover:underline">
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
  if (item.render) return item.render();
  return renderValue(item.value);
}

function buildAttributeGroups(plant: PlantWithRelations): AttributeGroup[] {
  return [
    {
      title: "Identity & classification",
      items: [
        { label: "Family", value: plant.family },
        { label: "Origin", value: plant.origin },
        { label: "Plant type", value: plant.plantType },
        { label: "Category", value: plant.category },
        { label: "Life cycle", value: plant.cycle },
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
      title: "Water & feeding",
      items: [
        { label: "Water guidance", value: plant.waterGeneral },
        { label: "Watering schedule", value: plant.watering },
        {
          label: "Water benchmark",
          value: plant.wateringGeneralBenchmark,
          render: () => renderWaterBenchmark(plant.wateringGeneralBenchmark),
        },
        { label: "Water quality notes", value: plant.wateringQuality },
        { label: "Watering period", value: plant.wateringPeriod },
        { label: "Average volume", value: plant.wateringAvgVolume },
        { label: "Watering depth", value: plant.wateringDepth },
        { label: "Temperature-based watering", value: plant.wateringBasedTemperature },
        { label: "Water pH range", value: plant.wateringPhLevel },
        { label: "Sunlight duration guidance", value: plant.sunlightDuration },
      ],
    },
    {
      title: "Growth & care",
      items: [
        { label: "Care notes", value: plant.careNotes },
        {
          label: "Planting windows",
          value: plant.climateWindows,
          render: () => renderPlantingWindows(plant.climateWindows ?? []),
        },
        { label: "Sowing depth (mm)", value: plant.sowDepthMm },
        { label: "In-row spacing (cm)", value: plant.spacingInRowCm },
        { label: "Row spacing (cm)", value: plant.spacingBetweenRowsCm },
        { label: "Produces seeds", value: plant.seeds },
        { label: "Pruning months", value: plant.pruningMonth },
        {
          label: "Pruning frequency",
          value: plant.pruningCount,
          render: () => renderPruningCount(plant.pruningCount),
        },
        {
          label: "Propagation methods",
          value: plant.propagationMethods,
          render: () => renderPropagationList(plant.propagationMethods ?? []),
        },
        { label: "Attracts", value: plant.attracts },
        {
          label: "Plant anatomy",
          value: plant.plantAnatomy,
          render: () => renderAnatomy(plant.plantAnatomy),
        },
      ],
    },
    {
      title: "Seasonal traits",
      items: [
        { label: "Produces flowers", value: plant.flowers },
        { label: "Flowering season", value: plant.floweringSeason },
        { label: "Produces cones", value: plant.cones },
        { label: "Produces fruit", value: plant.fruits },
        { label: "Fruiting season", value: plant.fruitingSeason },
        { label: "Harvest season", value: plant.harvestSeason },
        { label: "Harvest method", value: plant.harvestMethod },
        { label: "Leafy", value: plant.leaf },
      ],
    },
    {
      title: "Resilience & habitat",
      items: [
        { label: "Drought tolerant", value: plant.droughtTolerant },
        { label: "Salt tolerant", value: plant.saltTolerant },
        { label: "Thorny", value: plant.thorny },
        { label: "Invasive", value: plant.invasive },
        { label: "Rare", value: plant.rare },
        { label: "Tropical", value: plant.tropical },
        { label: "Diseases & pests", value: plant.diseases },
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
    return renderObject(value as Record<string, unknown>);
  }
  return <span className="text-slate-400">Not specified</span>;
}

function renderObject(value: Record<string, unknown>): ReactNode {
  const entries = Object.entries(value).filter(
    ([, entry]) => entry !== null && entry !== undefined && !(typeof entry === "string" && entry.trim() === ""),
  );
  if (!entries.length) {
    return <span className="text-slate-400">Not specified</span>;
  }
  return (
    <div className="space-y-2">
      {entries.map(([key, entry]) => (
        <div key={key}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{humanizeLabel(key)}</p>
          <div className="text-sm text-slate-700">{renderValue(entry)}</div>
        </div>
      ))}
    </div>
  );
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

function monthName(month: number) {
  return new Date(2000, month - 1, 1).toLocaleString("en-NZ", { month: "short" });
}

function formatList(values?: string[] | null, fallback?: string | null) {
  if (values?.length) return values.join(", ");
  if (fallback) return fallback;
  return "Not specified";
}

function formatHardiness(min?: string | null, max?: string | null) {
  if (!min && !max) return "Not specified";
  if (min && max) return `Zones ${min}-${max}`;
  if (min) return `Zones ${min}+`;
  return `Up to zone ${max}`;
}

function renderWaterBenchmark(value: unknown): ReactNode {
  if (!value || typeof value !== "object") {
    return <span className="text-slate-400">Not specified</span>;
  }
  const { value: rawValue, unit } = value as { value?: unknown; unit?: unknown };
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return <span className="text-slate-400">Not specified</span>;
  }
  const cleanValue = typeof rawValue === "string" ? rawValue.replace(/^"|"$/g, "") : String(rawValue);
  const cleanUnit = typeof unit === "string" && unit.trim() ? unit.trim() : "";
  const suffix = cleanUnit ? ` ${cleanUnit}` : "";
  return <span>{`Every ${cleanValue}${suffix}`}</span>;
}

function renderPruningCount(value: unknown): ReactNode {
  if (!value || typeof value !== "object") {
    return <span className="text-slate-400">Not specified</span>;
  }
  const { amount, interval } = value as { amount?: unknown; interval?: unknown };
  if (amount === null || amount === undefined || interval === null || interval === undefined) {
    return <span className="text-slate-400">Not specified</span>;
  }
  const cleanInterval = typeof interval === "string" ? interval : String(interval);
  return <span>{`${amount} × ${cleanInterval}`}</span>;
}

function renderAnatomy(value: unknown): ReactNode {
  if (!Array.isArray(value) || value.length === 0) {
    return <span className="text-slate-400">Not specified</span>;
  }
  return (
    <ul className="space-y-1">
      {value.map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return (
            <li key={index} className="text-sm text-slate-700">
              {renderValue(entry)}
            </li>
          );
        }
        const { part, color } = entry as { part?: string; color?: string[] };
        return (
          <li key={part ?? index} className="text-sm text-slate-700">
            <span className="font-medium">{part ?? "Part"}</span>
            {color?.length ? <span className="text-slate-500"> — {color.join(", ")}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function humanizeLabel(label: string): string {
  return label
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatDescriptor(value?: string | null): string {
  if (!value) return "Not specified";
  const clean = value.trim();
  if (!clean) return "Not specified";
  return clean
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function deriveMaintenanceTone(source: string | null): FactTone {
  if (!source) return "default";
  const normalized = source.toLowerCase();
  if (/(low|easy|minimal)/.test(normalized)) return "success";
  if (/(high|difficult|intensive|heavy)/.test(normalized)) return "warning";
  return "default";
}

function describeBoolean(
  value: boolean | null | undefined,
  positive: string,
  negative: string,
): { label: string; tone: FactTone } {
  if (value === true) return { label: positive, tone: "success" };
  if (value === false) return { label: negative, tone: "default" };
  return { label: "Not specified", tone: "default" };
}

function deriveEdibleInfo(plant: PlantWithRelations): { label: string; tone: FactTone } {
  const values = [plant.edibleFruit, plant.edibleLeaf];
  const known = values.some((entry) => entry !== null && entry !== undefined);
  const parts: string[] = [];
  if (plant.edibleFruit) parts.push("fruit");
  if (plant.edibleLeaf) parts.push("leaves");
  if (!known) return { label: "Not specified", tone: "default" };
  if (!parts.length) return { label: "Not typically consumed", tone: "warning" };
  if (parts.length === 2) return { label: "Fruit and leaves are edible", tone: "success" };
  return { label: parts[0] === "fruit" ? "Harvest the fruit" : "Harvest the leaves", tone: "success" };
}

function deriveToxicityInfo(
  poisonousToHumans?: boolean | null,
  poisonousToPets?: boolean | null,
): { label: string; tone: FactTone } {
  const humanKnown = poisonousToHumans !== null && poisonousToHumans !== undefined;
  const petKnown = poisonousToPets !== null && poisonousToPets !== undefined;
  if (!humanKnown && !petKnown) return { label: "Not specified", tone: "default" };
  if (poisonousToHumans && poisonousToPets) return { label: "Toxic to humans and pets", tone: "danger" };
  if (poisonousToHumans) return { label: "Toxic to humans", tone: "danger" };
  if (poisonousToPets) return { label: "Toxic to pets", tone: "danger" };
  if (poisonousToHumans === false && poisonousToPets === false) return { label: "Safe for humans and pets", tone: "success" };
  if (poisonousToHumans === false && !petKnown) return { label: "Safe for humans", tone: "success" };
  if (poisonousToPets === false && !humanKnown) return { label: "Safe for pets", tone: "success" };
  return { label: "Safety data incomplete", tone: "warning" };
}

function renderPlantingWindows(
  windows: NonNullable<PlantWithRelations["climateWindows"]>,
): ReactNode {
  if (!windows.length) {
    return <span className="text-slate-400">Not specified</span>;
  }
  return (
    <div className="space-y-2">
      {windows.map((window, index) => {
        const key = window.climateZoneId ?? `window-${index}`;
        const segments: string[] = [];
        const outdoors = formatRangeSet(window.sowOutdoors);
        if (outdoors) segments.push(`Sow outdoors: ${outdoors}`);
        const indoors = formatRangeSet(window.sowIndoors);
        if (indoors) segments.push(`Start indoors: ${indoors}`);
        const transplant = formatRangeSet(window.transplant);
        if (transplant) segments.push(`Transplant: ${transplant}`);

        if (!segments.length) {
          return (
            <div key={key} className="rounded border border-slate-100 bg-slate-50 p-2 text-sm text-slate-500">
              {window.climateZoneId ? `No timing data for ${window.climateZoneId}` : "No timing data recorded"}
            </div>
          );
        }

        return (
          <div key={key} className="space-y-1 rounded border border-slate-100 bg-slate-50 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {window.climateZoneId ?? "General guidance"}
            </p>
            <ul className="space-y-1 text-sm text-slate-700">
              {segments.map((segment) => (
                <li key={segment}>{segment}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function formatRangeSet(range: unknown): string | null {
  if (!Array.isArray(range)) return null;
  const segments = range
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const { start, end } = entry as { start?: number; end?: number };
      if (typeof start !== "number" || typeof end !== "number") return null;
      return `${monthName(start)}-${monthName(end)}`;
    })
    .filter((value): value is string => Boolean(value));
  if (!segments.length) return null;
  return segments.join(", ");
}

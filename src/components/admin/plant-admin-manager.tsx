"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import classNames from "classnames";
import { useToast } from "@/src/components/ui/toast";

type ClimateZoneOption = {
  id: string;
  name: string;
};

type PlantAdminClimateWindow = {
  id: string;
  climateZoneId: string;
  climateZone: ClimateZoneOption;
  sowIndoors: unknown | null;
  sowOutdoors: unknown | null;
  transplant: unknown | null;
  notes: string | null;
};

export type PlantAdminRecord = {
  id: string;
  perenualId: number | null;
  commonName: string;
  scientificName: string | null;
  otherNames: string[];
  family: string | null;
  origin: string | null;
  plantType: string | null;
  category: string;
  cycle: string | null;
  sunRequirement: string;
  sunlightExposure: string[];
  soilNotes: string | null;
  soilPreferences: string[];
  waterGeneral: string;
  watering: string | null;
  wateringGeneralBenchmark: unknown | null;
  plantAnatomy: unknown | null;
  pruningMonth: string[];
  pruningCount: unknown | null;
  seeds: number | null;
  attracts: string[];
  propagationMethods: string[];
  hardinessMin: string | null;
  hardinessMax: string | null;
  hardinessLocation: unknown | null;
  flowers: boolean | null;
  floweringSeason: string | null;
  cones: boolean | null;
  fruits: boolean | null;
  edibleFruit: boolean | null;
  fruitingSeason: string | null;
  harvestSeason: string | null;
  harvestMethod: string | null;
  leaf: boolean | null;
  edibleLeaf: boolean | null;
  daysToMaturity: number | null;
  growthRate: string | null;
  maintenanceLevel: string | null;
  medicinal: boolean | null;
  poisonousToHumans: boolean | null;
  poisonousToPets: boolean | null;
  droughtTolerant: boolean | null;
  saltTolerant: boolean | null;
  thorny: boolean | null;
  invasive: boolean | null;
  rare: boolean | null;
  tropical: boolean | null;
  cuisine: boolean | null;
  indoor: boolean | null;
  careLevel: string | null;
  careNotes: string | null;
  description: string | null;
  defaultImage: unknown | null;
  otherImages: unknown | null;
  imageLocalPath: string | null;
  wateringQuality: string[];
  wateringPeriod: string[];
  wateringAvgVolume: unknown | null;
  wateringDepth: unknown | null;
  wateringBasedTemperature: unknown | null;
  wateringPhLevel: unknown | null;
  sunlightDuration: unknown | null;
  sowDepthMm: number | null;
  spacingInRowCm: number | null;
  spacingBetweenRowsCm: number | null;
  climateWindows: PlantAdminClimateWindow[];
  createdAt: string;
  updatedAt: string;
};

type PlantAdminManagerProps = {
  initialPlants: PlantAdminRecord[];
  climateZones: ClimateZoneOption[];
};

type PlantEditableKeys = keyof Omit<
  PlantAdminRecord,
  "id" | "createdAt" | "updatedAt" | "climateWindows"
>;

type FieldKind = "string" | "text" | "stringArray" | "int" | "json" | "boolean";

type FieldConfig = {
  name: PlantEditableKeys;
  label: string;
  kind: FieldKind;
  required?: boolean;
  helper?: string;
};

const plantFieldGroups: Array<{ title: string; fields: FieldConfig[] }> = [
  {
    title: "Identity",
    fields: [
      { name: "perenualId", label: "Perenual ID", kind: "int", helper: "External reference identifier" },
      { name: "commonName", label: "Common name", kind: "string", required: true },
      { name: "scientificName", label: "Scientific name", kind: "string" },
      { name: "otherNames", label: "Other names", kind: "stringArray", helper: "Comma or newline separated" },
      { name: "family", label: "Family", kind: "string" },
      { name: "origin", label: "Origin", kind: "string" },
      { name: "plantType", label: "Plant type", kind: "string" },
      { name: "category", label: "Category", kind: "string", required: true },
      { name: "cycle", label: "Growth cycle", kind: "string" },
    ],
  },
  {
    title: "Light & soil",
    fields: [
      { name: "sunRequirement", label: "Sun requirement", kind: "string", required: true },
      { name: "sunlightExposure", label: "Sunlight exposure", kind: "stringArray", helper: "e.g. full sun, partial shade" },
      { name: "soilNotes", label: "Soil notes", kind: "text" },
      { name: "soilPreferences", label: "Soil preferences", kind: "stringArray" },
    ],
  },
  {
    title: "Watering",
    fields: [
      { name: "waterGeneral", label: "General watering guidance", kind: "text", required: true },
      { name: "watering", label: "Watering detail", kind: "text" },
      { name: "wateringQuality", label: "Water quality", kind: "stringArray" },
      { name: "wateringPeriod", label: "Watering period", kind: "stringArray" },
      { name: "wateringGeneralBenchmark", label: "Watering benchmark (JSON)", kind: "json" },
      { name: "wateringAvgVolume", label: "Average volume (JSON)", kind: "json" },
      { name: "wateringDepth", label: "Watering depth (JSON)", kind: "json" },
      { name: "wateringBasedTemperature", label: "Watering by temperature (JSON)", kind: "json" },
      { name: "wateringPhLevel", label: "Watering pH (JSON)", kind: "json" },
    ],
  },
  {
    title: "Growth & care",
    fields: [
      { name: "sowDepthMm", label: "Sow depth (mm)", kind: "int" },
      { name: "spacingInRowCm", label: "Spacing in row (cm)", kind: "int" },
      { name: "spacingBetweenRowsCm", label: "Spacing between rows (cm)", kind: "int" },
      { name: "seeds", label: "Seeds per packet", kind: "int" },
      { name: "daysToMaturity", label: "Days to maturity", kind: "int" },
      { name: "growthRate", label: "Growth rate", kind: "string" },
      { name: "maintenanceLevel", label: "Maintenance level", kind: "string" },
      { name: "careLevel", label: "Care level", kind: "string" },
      { name: "careNotes", label: "Care notes", kind: "text" },
      { name: "description", label: "Description", kind: "text" },
      { name: "plantAnatomy", label: "Plant anatomy (JSON)", kind: "json" },
      { name: "pruningMonth", label: "Pruning months", kind: "stringArray" },
      { name: "pruningCount", label: "Pruning count (JSON)", kind: "json" },
      { name: "propagationMethods", label: "Propagation methods", kind: "stringArray" },
      { name: "sunlightDuration", label: "Sunlight duration (JSON)", kind: "json" },
    ],
  },
  {
    title: "Hardiness & seasons",
    fields: [
      { name: "hardinessMin", label: "Hardiness minimum", kind: "string" },
      { name: "hardinessMax", label: "Hardiness maximum", kind: "string" },
      { name: "hardinessLocation", label: "Hardiness location (JSON)", kind: "json" },
      { name: "floweringSeason", label: "Flowering season", kind: "string" },
      { name: "fruitingSeason", label: "Fruiting season", kind: "string" },
      { name: "harvestSeason", label: "Harvest season", kind: "string" },
      { name: "harvestMethod", label: "Harvest method", kind: "string" },
    ],
  },
  {
    title: "Traits & flags",
    fields: [
      { name: "flowers", label: "Flowers", kind: "boolean" },
      { name: "cones", label: "Cones", kind: "boolean" },
      { name: "fruits", label: "Fruits", kind: "boolean" },
      { name: "edibleFruit", label: "Edible fruit", kind: "boolean" },
      { name: "leaf", label: "Leafy", kind: "boolean" },
      { name: "edibleLeaf", label: "Edible leaf", kind: "boolean" },
      { name: "medicinal", label: "Medicinal", kind: "boolean" },
      { name: "poisonousToHumans", label: "Poisonous to humans", kind: "boolean" },
      { name: "poisonousToPets", label: "Poisonous to pets", kind: "boolean" },
      { name: "droughtTolerant", label: "Drought tolerant", kind: "boolean" },
      { name: "saltTolerant", label: "Salt tolerant", kind: "boolean" },
      { name: "thorny", label: "Thorny", kind: "boolean" },
      { name: "invasive", label: "Invasive", kind: "boolean" },
      { name: "rare", label: "Rare", kind: "boolean" },
      { name: "tropical", label: "Tropical", kind: "boolean" },
      { name: "cuisine", label: "Culinary use", kind: "boolean" },
      { name: "indoor", label: "Suited to indoors", kind: "boolean" },
    ],
  },
  {
    title: "Attraction & media",
    fields: [
      { name: "attracts", label: "Attracts", kind: "stringArray" },
      { name: "imageLocalPath", label: "Image local path", kind: "string" },
      { name: "defaultImage", label: "Default image (JSON)", kind: "json" },
      { name: "otherImages", label: "Other images (JSON)", kind: "json" },
    ],
  },
];

const CLIMATE_WINDOW_EXAMPLE = '[{"start":3,"end":5}]';

type ClimateWindowDraft = {
  key: string;
  id?: string;
  climateZoneId: string;
  climateZoneName: string;
  sowIndoors: string;
  sowOutdoors: string;
  transplant: string;
  notes: string;
  isRemoved?: boolean;
};

export function PlantAdminManager({ initialPlants, climateZones }: PlantAdminManagerProps) {
  const [plants, setPlants] = useState(initialPlants);
  const [climateWindowDrafts, setClimateWindowDrafts] = useState<Record<string, ClimateWindowDraft[]>>(() =>
    buildWindowDrafts(initialPlants),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  const sortedPlants = useMemo(
    () => [...plants].sort((a, b) => a.commonName.localeCompare(b.commonName)),
    [plants],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>, plant: PlantAdminRecord) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {};
    const missingRequired: string[] = [];

    for (const field of allFieldConfigs) {
      const { name, kind, required } = field;
      const raw = form.get(name as string);

      switch (kind) {
        case "string":
        case "text": {
          const value = raw?.toString().trim() ?? "";
          if (!value && required) {
            missingRequired.push(field.label);
            payload[name] = value;
          } else {
            payload[name] = value.length ? value : null;
          }
          break;
        }
        case "stringArray": {
          const value = raw?.toString() ?? "";
          payload[name] = parseStringArray(value);
          break;
        }
        case "int": {
          const text = raw?.toString().trim();
          if (!text) {
            payload[name] = null;
          } else {
            const parsed = Number.parseInt(text, 10);
            if (Number.isNaN(parsed)) {
              pushToast({
                title: "Invalid number",
                description: `${field.label} must be a whole number`,
                variant: "error",
              });
              return;
            }
            payload[name] = parsed;
          }
          break;
        }
        case "json": {
          const text = raw?.toString().trim();
          if (!text) {
            payload[name] = null;
            break;
          }
          try {
            payload[name] = JSON.parse(text);
          } catch (error) {
            pushToast({
              title: "Invalid JSON",
              description: `Unable to parse ${field.label}. Ensure it is valid JSON or leave blank to clear.`,
              variant: "error",
            });
            return;
          }
          break;
        }
        case "boolean": {
          const value = raw?.toString();
          if (value === "true") payload[name] = true;
          else if (value === "false") payload[name] = false;
          else payload[name] = null;
          break;
        }
      }
    }

    if (missingRequired.length > 0) {
      pushToast({
        title: "Missing required fields",
        description: `Please fill ${missingRequired.join(", ")}.`,
        variant: "error",
      });
      return;
    }

    const drafts = climateWindowDrafts[plant.id] ?? [];
    const activeDrafts = drafts.filter((draft) => !draft.isRemoved);

    const climateWindows: Array<{
      id?: string;
      climateZoneId: string;
      sowIndoors: unknown | null;
      sowOutdoors: unknown | null;
      transplant: unknown | null;
      notes: string | null;
    }> = [];

    for (const draft of activeDrafts) {
      const sowIndoors = parseJsonDraft(draft.sowIndoors);
      if (sowIndoors === invalidJson) {
        pushToast({
          title: "Invalid JSON",
          description: `Sow indoors window for ${draft.climateZoneName} must be valid JSON or blank.`,
          variant: "error",
        });
        return;
      }
      const sowOutdoors = parseJsonDraft(draft.sowOutdoors);
      if (sowOutdoors === invalidJson) {
        pushToast({
          title: "Invalid JSON",
          description: `Sow outdoors window for ${draft.climateZoneName} must be valid JSON or blank.`,
          variant: "error",
        });
        return;
      }
      const transplant = parseJsonDraft(draft.transplant);
      if (transplant === invalidJson) {
        pushToast({
          title: "Invalid JSON",
          description: `Transplant window for ${draft.climateZoneName} must be valid JSON or blank.`,
          variant: "error",
        });
        return;
      }

      climateWindows.push({
        id: draft.id,
        climateZoneId: draft.climateZoneId,
        sowIndoors: sowIndoors === emptyJson ? null : sowIndoors,
        sowOutdoors: sowOutdoors === emptyJson ? null : sowOutdoors,
        transplant: transplant === emptyJson ? null : transplant,
        notes: draft.notes.trim() ? draft.notes.trim() : null,
      });
    }

    const deleteIds = drafts.filter((draft) => draft.isRemoved && draft.id).map((draft) => draft.id!);

    startTransition(async () => {
      const response = await fetch(`/api/admin/plants/${plant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plant: payload,
          climateWindows,
          deleteClimateWindowIds: deleteIds,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to update plant" }));
        pushToast({
          title: "Update failed",
          description: typeof data.error === "string" ? data.error : "Unable to update plant",
          variant: "error",
        });
        return;
      }

      const data = (await response.json()) as { plant: PlantAdminRecord };
      setPlants((previous) =>
        previous.map((existing) => (existing.id === plant.id ? data.plant : existing)),
      );
      setClimateWindowDrafts((previous) => ({
        ...previous,
        [plant.id]: buildWindowDrafts([data.plant])[plant.id] ?? [],
      }));
      setEditingId(null);
      pushToast({
        title: "Plant updated",
        description: `${data.plant.commonName} saved successfully`,
        variant: "success",
      });
    });
  };

  return (
    <div className="space-y-6">
      {sortedPlants.map((plant) => {
        const isEditing = editingId === plant.id;
        const lastUpdated = new Date(plant.updatedAt).toLocaleString();
        const createdOn = new Date(plant.createdAt).toLocaleDateString();

        return (
          <div key={plant.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{plant.commonName}</h2>
                <p className="text-sm text-slate-600">
                  {plant.scientificName ?? "No scientific name"} · {plant.category} · {plant.sunRequirement}
                </p>
                <p className="text-xs text-slate-500">Created {createdOn} · Last updated {lastUpdated}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={classNames(
                    "rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                    isEditing ? "border-slate-200 text-slate-500" : "border-primary text-primary",
                    isPending ? "opacity-60" : "hover:bg-primary/10",
                  )}
                  onClick={() => setEditingId(isEditing ? null : plant.id)}
                  disabled={isPending}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>
            </div>
            {isEditing ? (
              <form className="mt-6 space-y-8" onSubmit={(event) => handleSubmit(event, plant)}>
                {plantFieldGroups.map((group) => (
                  <section key={group.title} className="space-y-3">
                    <header>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                        {group.title}
                      </h3>
                    </header>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {group.fields.map((field) => (
                        <Field key={field.name as string} label={field.label} required={field.required} helper={field.helper}>
                          {renderFieldInput(field, plant)}
                        </Field>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="space-y-3">
                  <header className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                        Climate windows
                      </h3>
                      <p className="text-xs text-slate-500">
                        Windows expect JSON arrays of month ranges, e.g.{' '}
                        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
                          {CLIMATE_WINDOW_EXAMPLE}
                        </code>
                        . Leave blank to clear.
                      </p>
                    </div>
                    <AddClimateWindowButton
                      climateZones={climateZones}
                      drafts={climateWindowDrafts[plant.id] ?? []}
                      onAdd={(zone) =>
                        setClimateWindowDrafts((previous) => ({
                          ...previous,
                          [plant.id]: [
                            ...(previous[plant.id] ?? []),
                            {
                              key: cryptoRandomId(),
                              climateZoneId: zone.id,
                              climateZoneName: zone.name,
                              sowIndoors: "",
                              sowOutdoors: "",
                              transplant: "",
                              notes: "",
                            },
                          ],
                        }))
                      }
                    />
                  </header>
                  <div className="space-y-4">
                    {(climateWindowDrafts[plant.id] ?? [])
                      .filter((draft) => !draft.isRemoved)
                      .map((draft) => (
                        <div key={draft.key} className="rounded border border-slate-200 p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <h4 className="text-sm font-semibold text-slate-800">{draft.climateZoneName}</h4>
                            <button
                              type="button"
                              className="text-xs font-semibold uppercase tracking-wide text-red-600 hover:text-red-700"
                              onClick={() =>
                                setClimateWindowDrafts((previous) => ({
                                  ...previous,
                                  [plant.id]: (previous[plant.id] ?? []).map((entry) =>
                                    entry.key === draft.key ? { ...entry, isRemoved: true } : entry,
                                  ),
                                }))
                              }
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <TextareaField
                              label="Sow indoors"
                              value={draft.sowIndoors}
                              onChange={(value) =>
                                setClimateWindowDrafts((previous) => ({
                                  ...previous,
                                  [plant.id]: (previous[plant.id] ?? []).map((entry) =>
                                    entry.key === draft.key ? { ...entry, sowIndoors: value } : entry,
                                  ),
                                }))
                              }
                            />
                            <TextareaField
                              label="Sow outdoors"
                              value={draft.sowOutdoors}
                              onChange={(value) =>
                                setClimateWindowDrafts((previous) => ({
                                  ...previous,
                                  [plant.id]: (previous[plant.id] ?? []).map((entry) =>
                                    entry.key === draft.key ? { ...entry, sowOutdoors: value } : entry,
                                  ),
                                }))
                              }
                            />
                            <TextareaField
                              label="Transplant"
                              value={draft.transplant}
                              onChange={(value) =>
                                setClimateWindowDrafts((previous) => ({
                                  ...previous,
                                  [plant.id]: (previous[plant.id] ?? []).map((entry) =>
                                    entry.key === draft.key ? { ...entry, transplant: value } : entry,
                                  ),
                                }))
                              }
                            />
                            <label className="flex flex-col gap-1 text-sm">
                              <span className="font-medium text-slate-700">Notes</span>
                              <textarea
                                className="min-h-[80px] rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                value={draft.notes}
                                onChange={(event) =>
                                  setClimateWindowDrafts((previous) => ({
                                    ...previous,
                                    [plant.id]: (previous[plant.id] ?? []).map((entry) =>
                                      entry.key === draft.key ? { ...entry, notes: event.target.value } : entry,
                                    ),
                                  }))
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    onClick={() => setEditingId(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
                    disabled={isPending}
                  >
                    {isPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function renderFieldInput(field: FieldConfig, plant: PlantAdminRecord) {
  const value = plant[field.name];

  switch (field.kind) {
    case "string":
      return (
        <input
          name={field.name as string}
          defaultValue={(value as string | null) ?? ""}
          required={field.required}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      );
    case "text":
      return (
        <textarea
          name={field.name as string}
          defaultValue={(value as string | null) ?? ""}
          rows={4}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      );
    case "stringArray":
      return (
        <textarea
          name={field.name as string}
          defaultValue={formatStringArray(value as string[])}
          rows={3}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      );
    case "int":
      return (
        <input
          name={field.name as string}
          type="number"
          defaultValue={typeof value === "number" ? value : ""}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      );
    case "json":
      return (
        <textarea
          name={field.name as string}
          defaultValue={formatJsonField(value)}
          rows={4}
          className="w-full rounded border border-slate-300 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      );
    case "boolean":
      return (
        <select
          name={field.name as string}
          defaultValue={value === null || value === undefined ? "" : value ? "true" : "false"}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Not specified</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
  }
}

const allFieldConfigs = plantFieldGroups.flatMap((group) => group.fields);

function formatStringArray(values: string[] | undefined) {
  return values && values.length ? values.join("\n") : "";
}

function parseStringArray(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function formatJsonField(value: unknown | null) {
  if (value == null) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

const invalidJson = Symbol("invalid-json");
const emptyJson = Symbol("empty-json");

function parseJsonDraft(value: string) {
  const text = value.trim();
  if (!text) return emptyJson;
  try {
    return JSON.parse(text);
  } catch (error) {
    return invalidJson;
  }
}

function buildWindowDrafts(plants: PlantAdminRecord[]) {
  const drafts: Record<string, ClimateWindowDraft[]> = {};
  for (const plant of plants) {
    drafts[plant.id] = plant.climateWindows.map((window) => ({
      key: window.id,
      id: window.id,
      climateZoneId: window.climateZoneId,
      climateZoneName: window.climateZone.name,
      sowIndoors: formatJsonField(window.sowIndoors),
      sowOutdoors: formatJsonField(window.sowOutdoors),
      transplant: formatJsonField(window.transplant),
      notes: window.notes ?? "",
    }));
  }
  return drafts;
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `draft-${Math.random().toString(36).slice(2, 10)}`;
}

type FieldProps = {
  label: string;
  required?: boolean;
  helper?: string;
  children: ReactNode;
};

function Field({ label, required, helper, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
      {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
    </label>
  );
}

type AddClimateWindowButtonProps = {
  climateZones: ClimateZoneOption[];
  drafts: ClimateWindowDraft[];
  onAdd: (zone: ClimateZoneOption) => void;
};

function AddClimateWindowButton({ climateZones, drafts, onAdd }: AddClimateWindowButtonProps) {
  const availableZones = climateZones.filter(
    (zone) => !drafts.some((draft) => !draft.isRemoved && draft.climateZoneId === zone.id),
  );

  if (availableZones.length === 0) return null;

  return (
    <select
      className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
      defaultValue=""
      onChange={(event) => {
        const zone = availableZones.find((entry) => entry.id === event.target.value);
        if (zone) {
          onAdd(zone);
          event.currentTarget.value = "";
        }
      }}
    >
      <option value="">Add climate zone…</option>
      {availableZones.map((zone) => (
        <option key={zone.id} value={zone.id}>
          {zone.name}
        </option>
      ))}
    </select>
  );
}

type TextareaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextareaField({ label, value, onChange }: TextareaFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <textarea
        className="min-h-[80px] rounded border border-slate-300 px-3 py-2 font-mono text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

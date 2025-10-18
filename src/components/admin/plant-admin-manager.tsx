"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import classNames from "classnames";
import { useToast } from "@/src/components/ui/toast";

export type PlantAdminRecord = {
  id: string;
  commonName: string;
  scientificName: string | null;
  category: string;
  sunRequirement: string;
  cycle: string | null;
  daysToMaturity: number | null;
  sowDepthMm: number | null;
  spacingInRowCm: number | null;
  spacingBetweenRowsCm: number | null;
  careNotes: string | null;
  imageLocalPath: string | null;
  updatedAt: string;
};

type PlantAdminManagerProps = {
  initialPlants: PlantAdminRecord[];
};

export function PlantAdminManager({ initialPlants }: PlantAdminManagerProps) {
  const [plants, setPlants] = useState(initialPlants);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  const sortedPlants = useMemo(
    () => [...plants].sort((a, b) => a.commonName.localeCompare(b.commonName)),
    [plants],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>, plantId: string) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const commonName = form.get("commonName")?.toString().trim() ?? "";
    const category = form.get("category")?.toString().trim() ?? "";
    const sunRequirement = form.get("sunRequirement")?.toString().trim() ?? "";

    if (!commonName || !category || !sunRequirement) {
      pushToast({
        title: "Missing required fields",
        description: "Common name, category, and sun requirement are required.",
        variant: "error",
      });
      return;
    }

    const payload: Record<string, unknown> = {
      commonName,
      category,
      sunRequirement,
      scientificName: normalizeNullable(form.get("scientificName")),
      cycle: normalizeNullable(form.get("cycle")),
      daysToMaturity: normalizeNumber(form.get("daysToMaturity"), { positive: true }),
      sowDepthMm: normalizeNumber(form.get("sowDepthMm"), { allowZero: true }),
      spacingInRowCm: normalizeNumber(form.get("spacingInRowCm"), { allowZero: true }),
      spacingBetweenRowsCm: normalizeNumber(form.get("spacingBetweenRowsCm"), { allowZero: true }),
      careNotes: normalizeNullable(form.get("careNotes")),
      imageLocalPath: normalizeNullable(form.get("imageLocalPath")),
    };

    startTransition(async () => {
      const response = await fetch(`/api/admin/plants/${plantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setPlants((previous) => previous.map((plant) => (plant.id === plantId ? data.plant : plant)));
      setEditingId(null);
      pushToast({
        title: "Plant updated",
        description: `${data.plant.commonName} saved successfully`,
        variant: "success",
      });
    });
  };

  return (
    <div className="space-y-4">
      {sortedPlants.map((plant) => {
        const isEditing = editingId === plant.id;
        const lastUpdated = new Date(plant.updatedAt).toLocaleString();

        return (
          <div key={plant.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{plant.commonName}</h2>
                <p className="text-sm text-slate-600">
                  {plant.scientificName ?? "No scientific name"} · {plant.category} · {plant.sunRequirement}
                </p>
                <p className="text-xs text-slate-500">Last updated {lastUpdated}</p>
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
              <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={(event) => handleSubmit(event, plant.id)}>
                <Field label="Common name" required>
                  <input
                    name="commonName"
                    defaultValue={plant.commonName}
                    required
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Scientific name">
                  <input
                    name="scientificName"
                    defaultValue={plant.scientificName ?? ""}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Category" required>
                  <input
                    name="category"
                    defaultValue={plant.category}
                    required
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Sun requirement" required>
                  <input
                    name="sunRequirement"
                    defaultValue={plant.sunRequirement}
                    required
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Growth cycle">
                  <input
                    name="cycle"
                    defaultValue={plant.cycle ?? ""}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Days to maturity">
                  <input
                    name="daysToMaturity"
                    defaultValue={plant.daysToMaturity ?? ""}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Sow depth (mm)">
                  <input
                    name="sowDepthMm"
                    defaultValue={plant.sowDepthMm ?? ""}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Spacing in row (cm)">
                  <input
                    name="spacingInRowCm"
                    defaultValue={plant.spacingInRowCm ?? ""}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Spacing between rows (cm)">
                  <input
                    name="spacingBetweenRowsCm"
                    defaultValue={plant.spacingBetweenRowsCm ?? ""}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Image path">
                  <input
                    name="imageLocalPath"
                    defaultValue={plant.imageLocalPath ?? ""}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <Field label="Care notes" className="md:col-span-2">
                  <textarea
                    name="careNotes"
                    defaultValue={plant.careNotes ?? ""}
                    rows={4}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>
                <div className="md:col-span-2 flex items-center justify-end gap-2">
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

type FieldProps = {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

function Field({ label, required, className, children }: FieldProps) {
  return (
    <label className={classNames("flex flex-col gap-1 text-sm", className)}>
      <span className="font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function normalizeNullable(value: FormDataEntryValue | null): string | null {
  if (value == null) return null;
  const trimmed = value.toString().trim();
  return trimmed.length ? trimmed : null;
}

function normalizeNumber(
  value: FormDataEntryValue | null,
  options: { allowZero?: boolean; positive?: boolean } = {},
): number | null {
  if (value == null) return null;
  const text = value.toString().trim();
  if (!text) return null;
  const numeric = Number.parseInt(text, 10);
  if (Number.isNaN(numeric)) return null;
  if (options.positive && numeric <= 0) return null;
  if (!options.allowZero && numeric < 0) return null;
  return numeric;
}

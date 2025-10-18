"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useCallback } from "react";
import type { DragEvent, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

// Roughly 30cm (~12") mirrors average spacing recommendations for many kitchen garden staples.
const DEFAULT_SPACING_CM = 30;

type PlannerPlanting = {
  id: string;
  plantId: string;
  plantName: string;
  imageUrl: string | null;
  startDate: string;
  positionX: number | null;
  positionY: number | null;
};

type PlannerBed = {
  id: string;
  name: string;
  widthCm: number;
  lengthCm: number;
  heightCm: number | null;
  plantings: PlannerPlanting[];
};

type PlannerGarden = {
  id: string;
  name: string;
  widthCm: number;
  lengthCm: number;
  heightCm: number | null;
  beds: PlannerBed[];
};

type PlannerPlant = {
  id: string;
  name: string;
  imageUrl: string | null;
  spacingInRowCm: number | null;
  spacingBetweenRowsCm: number | null;
};

type PendingPlacement = {
  bedId: string;
  plant: PlannerPlant;
  dropX: number;
  dropY: number;
  leftPercent: number;
  topPercent: number;
};

type FeedbackMessage = { type: "success" | "error"; text: string };

export type GardenPlannerProps = {
  gardens: PlannerGarden[];
  plants: PlannerPlant[];
};

export function GardenPlanner({ gardens, plants }: GardenPlannerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedGardenId, setSelectedGardenId] = useState(gardens[0]?.id ?? "");
  const [selectedBedId, setSelectedBedId] = useState(gardens[0]?.beds[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [bedFeedback, setBedFeedback] = useState<FeedbackMessage | null>(null);
  const [gardenFeedback, setGardenFeedback] = useState<FeedbackMessage | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);

  const activeGarden = gardens.find((garden) => garden.id === selectedGardenId) ?? gardens[0];
  const activeBed =
    activeGarden?.beds.find((bed) => bed.id === selectedBedId) ?? activeGarden?.beds[0] ?? null;
  const bedWidthCm = activeBed?.widthCm ?? 1;
  const bedLengthCm = activeBed?.lengthCm ?? 1;

  useEffect(() => {
    if (!activeGarden) {
      setSelectedBedId("");
      return;
    }
    if (!activeGarden.beds.some((bed) => bed.id === selectedBedId)) {
      setSelectedBedId(activeGarden.beds[0]?.id ?? "");
    }
  }, [activeGarden, selectedBedId]);

  useEffect(() => {
    setPendingPlacement(null);
  }, [selectedBedId, selectedGardenId]);

  const filteredPlants = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return plants;
    return plants.filter((plant) => plant.name.toLowerCase().includes(keyword));
  }, [plants, query]);

  const handleCreateBed = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeGarden) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("bedName") ?? "").trim();
    const width = Number(form.get("bedWidth"));
    const length = Number(form.get("bedLength"));
    const height = Number(form.get("bedHeight"));
    if (!name || Number.isNaN(width) || Number.isNaN(length) || Number.isNaN(height)) {
      setBedFeedback({ type: "error", text: "Please provide a name and numeric dimensions." });
      return;
    }
    setBedFeedback(null);
    startTransition(async () => {
      const response = await fetch("/api/beds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gardenId: activeGarden.id,
          name,
          widthCm: width,
          lengthCm: length,
          heightCm: height,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to add bed" }));
        setBedFeedback({
          type: "error",
          text: typeof data.error === "string" ? data.error : "Unable to add bed",
        });
        return;
      }
      formElement.reset();
      setBedFeedback({ type: "success", text: "Bed added" });
      router.refresh();
    });
  };

  const createPlantings = useCallback(
    (
      bedId: string,
      plantId: string,
      placements: Array<{ positionX: number; positionY: number; spanWidth?: number | null; spanHeight?: number | null }>,
    ) => {
      if (!placements.length) return;
      startTransition(async () => {
        await fetch("/api/plantings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bedId,
            plantId,
            startDate: new Date().toISOString(),
            placements,
          }),
        });
        router.refresh();
      });
    },
    [router, startTransition],
  );

  const handleCreatePlanting = (bedId: string, plantId: string, x: number, y: number) => {
    createPlantings(bedId, plantId, [{ positionX: x, positionY: y }]);
  };

  const handleUpdatePlanting = (plantingId: string, x: number, y: number) => {
    startTransition(async () => {
      await fetch("/api/plantings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plantingId, positionX: x, positionY: y }),
      });
      router.refresh();
    });
  };

  const handleDeletePlanting = (plantingId: string) => {
    startTransition(async () => {
      await fetch(`/api/plantings?id=${encodeURIComponent(plantingId)}`, { method: "DELETE" });
      router.refresh();
    });
  };

  const handleDeleteBed = (bedId: string) => {
    if (!activeGarden) return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Remove this bed and all of its plantings?");
      if (!confirmed) {
        return;
      }
    }

    setBedFeedback(null);
    startTransition(async () => {
      const response = await fetch(`/api/beds?id=${encodeURIComponent(bedId)}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to remove bed" }));
        setBedFeedback({
          type: "error",
          text: typeof data.error === "string" ? data.error : "Unable to remove bed",
        });
        return;
      }
      const nextBed = activeGarden.beds.find((bed) => bed.id !== bedId);
      setBedFeedback({ type: "success", text: "Bed removed" });
      setSelectedBedId(nextBed?.id ?? "");
      router.refresh();
    });
  };

  const handleRenameGarden = useCallback(
    (gardenId: string) => {
      const garden = gardens.find((g) => g.id === gardenId);
      if (!garden) return;
      const name = typeof window !== "undefined" ? window.prompt("Rename garden", garden.name) : null;
      if (!name) {
        return;
      }
      const trimmed = name.trim();
      if (!trimmed) {
        setGardenFeedback({ type: "error", text: "Garden name cannot be empty." });
        return;
      }
      setGardenFeedback(null);
      startTransition(async () => {
        const response = await fetch("/api/garden", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: gardenId,
            name: trimmed,
            widthCm: garden.widthCm,
            lengthCm: garden.lengthCm,
            heightCm: garden.heightCm ?? undefined,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Unable to rename garden" }));
          setGardenFeedback({
            type: "error",
            text: typeof data.error === "string" ? data.error : "Unable to rename garden",
          });
          return;
        }
        setGardenFeedback({ type: "success", text: "Garden renamed" });
        router.refresh();
      });
    },
    [gardens, router, startTransition],
  );

  const handleDeleteGarden = useCallback(
    (gardenId: string) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Remove this garden, its beds, and all plantings?");
        if (!confirmed) {
          return;
        }
      }
      setGardenFeedback(null);
      const nextGarden = gardens.find((garden) => garden.id !== gardenId);
      startTransition(async () => {
        const response = await fetch(`/api/garden?id=${encodeURIComponent(gardenId)}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Unable to remove garden" }));
          setGardenFeedback({
            type: "error",
            text: typeof data.error === "string" ? data.error : "Unable to remove garden",
          });
          return;
        }
        setGardenFeedback({ type: "success", text: "Garden removed" });
        setSelectedGardenId(nextGarden?.id ?? "");
        setSelectedBedId(nextGarden?.beds[0]?.id ?? "");
        router.refresh();
      });
    },
    [gardens, router, startTransition],
  );

  const resolveBedById = useCallback(
    (bedId: string) => {
      for (const garden of gardens) {
        const bed = garden.beds.find((candidate) => candidate.id === bedId);
        if (bed) return bed;
      }
      return null;
    },
    [gardens],
  );

  const getSpacing = useCallback(
    (plant: PlannerPlant) => ({
      inRow: plant.spacingInRowCm ?? DEFAULT_SPACING_CM,
      between: plant.spacingBetweenRowsCm ?? plant.spacingInRowCm ?? DEFAULT_SPACING_CM,
    }),
    [],
  );

  const commitPlacement = useCallback(
    (mode: "single" | "width" | "length") => {
      if (!pendingPlacement) return;
      const bed = resolveBedById(pendingPlacement.bedId);
      if (!bed) return;

      const basePlacements: Array<{ positionX: number; positionY: number }> = [];
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
      const safeWidth = Math.max(1, bed.widthCm);
      const safeLength = Math.max(1, bed.lengthCm);
      const spacing = getSpacing(pendingPlacement.plant);

      if (mode === "single") {
        basePlacements.push({
          positionX: clamp(pendingPlacement.dropX, 0, safeWidth),
          positionY: clamp(pendingPlacement.dropY, 0, safeLength),
        });
      } else if (mode === "width") {
        const horizontalSpacing = Math.max(10, spacing.inRow);
        const rowY = clamp(pendingPlacement.dropY, horizontalSpacing / 2, safeLength - horizontalSpacing / 2);
        let current = horizontalSpacing / 2;
        while (current <= safeWidth) {
          basePlacements.push({ positionX: Math.round(current), positionY: Math.round(rowY) });
          current += horizontalSpacing;
        }
        if (!basePlacements.length) {
          basePlacements.push({ positionX: Math.round(safeWidth / 2), positionY: Math.round(rowY) });
        }
      } else {
        const verticalSpacing = Math.max(10, spacing.between);
        const columnX = clamp(pendingPlacement.dropX, verticalSpacing / 2, safeWidth - verticalSpacing / 2);
        let current = verticalSpacing / 2;
        while (current <= safeLength) {
          basePlacements.push({ positionX: Math.round(columnX), positionY: Math.round(current) });
          current += verticalSpacing;
        }
        if (!basePlacements.length) {
          basePlacements.push({ positionX: Math.round(columnX), positionY: Math.round(safeLength / 2) });
        }
      }

      createPlantings(
        pendingPlacement.bedId,
        pendingPlacement.plant.id,
        basePlacements.map((placement) => ({ positionX: placement.positionX, positionY: placement.positionY })),
      );
      setPendingPlacement(null);
    },
    [createPlantings, getSpacing, pendingPlacement, resolveBedById],
  );

  const cancelPlacement = useCallback(() => setPendingPlacement(null), []);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!activeBed) return;
    setPendingPlacement(null);
    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;
    const x = Math.max(0, Math.min(activeBed.widthCm, Math.round(xRatio * activeBed.widthCm)));
    const y = Math.max(0, Math.min(activeBed.lengthCm, Math.round(yRatio * activeBed.lengthCm)));

    const plantData = event.dataTransfer.getData("application/garden-plant");
    if (plantData) {
      const payload = JSON.parse(plantData) as { plantId: string };
      const plant = plants.find((item) => item.id === payload.plantId);
      if (!plant) {
        return;
      }
      setPendingPlacement({
        bedId: activeBed.id,
        plant,
        dropX: x,
        dropY: y,
        leftPercent: (x / activeBed.widthCm) * 100,
        topPercent: (y / activeBed.lengthCm) * 100,
      });
      return;
    }
    const plantingData = event.dataTransfer.getData("application/garden-planting");
    if (plantingData) {
      const payload = JSON.parse(plantingData) as { plantingId: string };
      handleUpdatePlanting(payload.plantingId, x, y);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">
            Garden
            <select
              className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
              value={selectedGardenId}
              onChange={(event) => {
                setSelectedGardenId(event.target.value);
                const garden = gardens.find((g) => g.id === event.target.value);
                setSelectedBedId(garden?.beds[0]?.id ?? "");
              }}
            >
              {gardens.map((garden) => (
                <option key={garden.id} value={garden.id}>
                  {garden.name}
                </option>
              ))}
            </select>
          </label>
          {activeGarden ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRenameGarden(activeGarden.id)}
                className="text-xs font-semibold uppercase tracking-wide text-primary"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => handleDeleteGarden(activeGarden.id)}
                className="text-xs font-semibold uppercase tracking-wide text-red-500"
              >
                Remove
              </button>
            </div>
          ) : null}
          {activeGarden ? (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">
                Bed
                <select
                  className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
                  value={selectedBedId}
                  onChange={(event) => setSelectedBedId(event.target.value)}
                >
                  {activeGarden.beds.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.name} ({bed.widthCm}×{bed.lengthCm}cm base
                      {bed.heightCm ? `, ${bed.heightCm}cm tall` : ""})
                    </option>
                  ))}
                </select>
              </label>
              {activeGarden.beds.length ? (
                <button
                  type="button"
                  onClick={() => selectedBedId && handleDeleteBed(selectedBedId)}
                  className="text-xs font-semibold uppercase tracking-wide text-red-500"
                >
                  Remove bed
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {gardenFeedback ? (
          <p
            className={`text-xs ${
              gardenFeedback.type === "error" ? "text-red-500" : "text-emerald-600"
            }`}
          >
            {gardenFeedback.text}
          </p>
        ) : null}
        {activeGarden ? (
          <form
            onSubmit={handleCreateBed}
            className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-700">Add a bed</p>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Name
                <input
                  name="bedName"
                  type="text"
                  placeholder="e.g. Herb patch"
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Width (cm)
                <input
                  name="bedWidth"
                  type="number"
                  min={10}
                  defaultValue={activeGarden.widthCm}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Length (cm)
                <input
                  name="bedLength"
                  type="number"
                  min={30}
                  defaultValue={activeGarden.lengthCm}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </label>
                <label className="space-y-1 text-xs font-medium text-slate-600">
                  Bed height (cm)
                  <input
                    name="bedHeight"
                    type="number"
                    min={10}
                    defaultValue={activeGarden.heightCm ?? 40}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                    required
                  />
                </label>
            </div>
            {bedFeedback ? (
              <p
                className={`text-xs ${
                  bedFeedback.type === "error" ? "text-red-500" : "text-emerald-600"
                }`}
              >
                {bedFeedback.text}
              </p>
            ) : null}
            <div>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving…" : "Add bed"}
              </Button>
            </div>
          </form>
        ) : null}
        {activeBed ? (
          <div>
            <div
              className="relative w-full overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50"
              style={{ paddingBottom: `${(bedLengthCm / bedWidthCm) * 100}%` }}
            >
              <div className="absolute inset-0" onDrop={handleDrop} onDragOver={handleDragOver}>
                {activeBed.plantings.map((planting) => {
                  const left = planting.positionX ?? bedWidthCm / 2;
                  const top = planting.positionY ?? bedLengthCm / 2;
                  const leftPercent = (left / bedWidthCm) * 100;
                  const topPercent = (top / bedLengthCm) * 100;
                  return (
                    <div
                      key={planting.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "application/garden-planting",
                          JSON.stringify({ plantingId: planting.id }),
                        );
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      className="group absolute flex w-20 -translate-x-1/2 -translate-y-1/2 cursor-move flex-col items-center gap-2 rounded-lg border border-primary/40 bg-white p-2 text-center shadow"
                      style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                    >
                      {planting.imageUrl ? (
                        <Image
                          src={planting.imageUrl}
                          alt={planting.plantName}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded bg-primary/10 text-sm font-semibold text-primary">
                          {planting.plantName.charAt(0)}
                        </div>
                      )}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-700">{planting.plantName}</p>
                        <button
                          type="button"
                          onClick={() => handleDeletePlanting(planting.id)}
                          className="hidden text-[10px] font-semibold uppercase tracking-wide text-red-500 group-hover:block"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
                {pendingPlacement && pendingPlacement.bedId === activeBed.id ? (
                  <>
                    <div className="pointer-events-none absolute inset-0">
                      <div
                        className="absolute left-0 h-px w-full bg-primary/30"
                        style={{ top: `${pendingPlacement.topPercent}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-px bg-primary/30"
                        style={{ left: `${pendingPlacement.leftPercent}%` }}
                      />
                    </div>
                    <div
                      className="absolute z-20 w-60 max-w-[16rem] -translate-x-1/2 translate-y-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-left shadow-lg"
                      style={{ left: `${pendingPlacement.leftPercent}%`, top: `${pendingPlacement.topPercent}%` }}
                    >
                      <p className="text-xs font-semibold text-slate-700">
                        Plan {pendingPlacement.plant.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Use spacing of {getSpacing(pendingPlacement.plant).inRow}cm in-row and
                        {" "}
                        {getSpacing(pendingPlacement.plant).between}cm between rows.
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => commitPlacement("width")}
                          className="flex flex-col items-center gap-2 rounded border border-slate-200 p-2 text-[11px] font-medium text-slate-600 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <span className="flex h-10 w-full items-center justify-center">
                            <span className="h-1 w-full rounded bg-primary/70" />
                          </span>
                          Fill width
                        </button>
                        <button
                          type="button"
                          onClick={() => commitPlacement("length")}
                          className="flex flex-col items-center gap-2 rounded border border-slate-200 p-2 text-[11px] font-medium text-slate-600 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <span className="flex h-10 w-full items-center justify-center">
                            <span className="h-full w-1 rounded bg-primary/70" />
                          </span>
                          Fill length
                        </button>
                        <button
                          type="button"
                          onClick={() => commitPlacement("single")}
                          className="flex flex-col items-center gap-2 rounded border border-slate-200 p-2 text-[11px] font-medium text-slate-600 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
                        >
                          <span className="flex h-10 w-full items-center justify-center">
                            <span className="h-2 w-2 rounded-full bg-primary/70" />
                          </span>
                          Single plant
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={cancelPlacement}
                        className="w-full text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : null}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
                  {isPending ? "Saving changes…" : "Drag plants here"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Add a bed to this garden to start planning layouts.
          </p>
        )}
      </div>
      <aside className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="plant-search">
            Search plants
          </label>
          <input
            id="plant-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="grid max-h-[28rem] gap-3 overflow-y-auto pr-1">
          {filteredPlants.map((plant) => (
            <button
              key={plant.id}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  "application/garden-plant",
                  JSON.stringify({ plantId: plant.id }),
                );
                event.dataTransfer.effectAllowed = "copy";
              }}
              className="flex items-center gap-3 rounded border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow"
            >
              {plant.imageUrl ? (
                <Image
                  src={plant.imageUrl}
                  alt={plant.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-sm font-semibold text-slate-500">
                  {plant.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-slate-700">{plant.name}</p>
                <p className="text-xs text-slate-500">Drag onto your bed to add a planting.</p>
              </div>
            </button>
          ))}
          {filteredPlants.length === 0 ? (
            <p className="text-sm text-slate-500">No plants match your search.</p>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={() => router.push("/plants")}
          variant="secondary"
          className="w-full"
        >
          Browse full library
        </Button>
      </aside>
    </div>
  );
}

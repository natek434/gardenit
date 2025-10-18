"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { DragEvent, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export type GardenPlannerProps = {
  gardens: Array<{
    id: string;
    name: string;
    widthCm: number;
    heightCm: number;
    beds: Array<{
      id: string;
      name: string;
      widthCm: number;
      heightCm: number;
      plantings: Array<{
        id: string;
        plantId: string;
        plantName: string;
        imageUrl: string | null;
        startDate: string;
        positionX: number | null;
        positionY: number | null;
      }>;
    }>;
  }>;
  plants: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
  }>;
};

export function GardenPlanner({ gardens, plants }: GardenPlannerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedGardenId, setSelectedGardenId] = useState(gardens[0]?.id ?? "");
  const [selectedBedId, setSelectedBedId] = useState(gardens[0]?.beds[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [bedMessage, setBedMessage] = useState<string | null>(null);

  const activeGarden = gardens.find((garden) => garden.id === selectedGardenId) ?? gardens[0];
  const activeBed =
    activeGarden?.beds.find((bed) => bed.id === selectedBedId) ?? activeGarden?.beds[0] ?? null;

  useEffect(() => {
    if (!activeGarden) {
      setSelectedBedId("");
      return;
    }
    if (!activeGarden.beds.some((bed) => bed.id === selectedBedId)) {
      setSelectedBedId(activeGarden.beds[0]?.id ?? "");
    }
  }, [activeGarden, selectedBedId]);

  const filteredPlants = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return plants;
    return plants.filter((plant) => plant.name.toLowerCase().includes(keyword));
  }, [plants, query]);

  const handleCreateBed = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeGarden) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("bedName") ?? "").trim();
    const width = Number(form.get("bedWidth"));
    const height = Number(form.get("bedHeight"));
    if (!name || Number.isNaN(width) || Number.isNaN(height)) {
      setBedMessage("Please provide a name and numeric dimensions.");
      return;
    }
    setBedMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/beds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gardenId: activeGarden.id,
          name,
          widthCm: width,
          heightCm: height,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to add bed" }));
        setBedMessage(typeof data.error === "string" ? data.error : "Unable to add bed");
        return;
      }
      (event.currentTarget as HTMLFormElement).reset();
      setBedMessage("Bed added");
      router.refresh();
    });
  };

  const handleCreatePlanting = (bedId: string, plantId: string, x: number, y: number) => {
    startTransition(async () => {
      await fetch("/api/plantings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bedId,
          plantId,
          startDate: new Date().toISOString(),
          positionX: x,
          positionY: y,
        }),
      });
      router.refresh();
    });
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

    setBedMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/beds?id=${encodeURIComponent(bedId)}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to remove bed" }));
        setBedMessage(typeof data.error === "string" ? data.error : "Unable to remove bed");
        return;
      }
      const nextBed = activeGarden.beds.find((bed) => bed.id !== bedId);
      setBedMessage("Bed removed");
      setSelectedBedId(nextBed?.id ?? "");
      router.refresh();
    });
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!activeBed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xRatio = (event.clientX - rect.left) / rect.width;
    const yRatio = (event.clientY - rect.top) / rect.height;
    const x = Math.max(0, Math.min(activeBed.widthCm, Math.round(xRatio * activeBed.widthCm)));
    const y = Math.max(0, Math.min(activeBed.heightCm, Math.round(yRatio * activeBed.heightCm)));

    const plantData = event.dataTransfer.getData("application/garden-plant");
    if (plantData) {
      const payload = JSON.parse(plantData) as { plantId: string };
      handleCreatePlanting(activeBed.id, payload.plantId, x, y);
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
              <label className="text-sm font-medium text-slate-700">
                Bed
                <select
                  className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
                  value={selectedBedId}
                  onChange={(event) => setSelectedBedId(event.target.value)}
                >
                  {activeGarden.beds.map((bed) => (
                    <option key={bed.id} value={bed.id}>
                      {bed.name} ({bed.widthCm}×{bed.heightCm}cm)
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
        {activeGarden ? (
          <form
            onSubmit={handleCreateBed}
            className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-700">Add a bed</p>
            <div className="grid gap-3 sm:grid-cols-3">
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
                  min={30}
                  defaultValue={activeGarden.widthCm}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600">
                Height (cm)
                <input
                  name="bedHeight"
                  type="number"
                  min={30}
                  defaultValue={activeGarden.heightCm}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                />
              </label>
            </div>
            {bedMessage ? <p className="text-xs text-red-500">{bedMessage}</p> : null}
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
              className="relative aspect-[4/3] w-full rounded-lg border border-dashed border-slate-300 bg-slate-50"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {activeBed.plantings.map((planting) => {
                const left = planting.positionX ?? activeBed.widthCm / 2;
                const top = planting.positionY ?? activeBed.heightCm / 2;
                const leftPercent = (left / activeBed.widthCm) * 100;
                const topPercent = (top / activeBed.heightCm) * 100;
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
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
                {isPending ? "Saving changes…" : "Drag plants here"}
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

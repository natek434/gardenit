"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, DragEvent, FocusEvent, FormEvent, RefObject } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FocusKind } from "@prisma/client";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

// Roughly 30cm (~12") mirrors average spacing recommendations for many kitchen garden staples.
const DEFAULT_SPACING_CM = 30;
const DEFAULT_CELL_SIZE_CM = 10;
const DAY_IN_MS = 1000 * 60 * 60 * 24;
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type PlannerPlanting = {
  id: string;
  plantId: string;
  plantName: string;
  imageUrl: string | null;
  startDate: string;
  daysToMaturity: number | null;
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

type PlannerFocusItem = {
  id: string;
  kind: FocusKind;
  targetId: string;
  label: string | null;
};

type DragPreview = {
  bedId: string;
  x: number;
  y: number;
  leftPercent: number;
  topPercent: number;
};

export type GardenPlannerProps = {
  gardens: PlannerGarden[];
  plants: PlannerPlant[];
  focusItems: PlannerFocusItem[];
};

function snapToCellCenter(xCm: number, yCm: number, cellSizeCm = DEFAULT_CELL_SIZE_CM) {
  const safeCell = Math.max(1, cellSizeCm);
  const col = Math.floor(Math.max(0, xCm) / safeCell);
  const row = Math.floor(Math.max(0, yCm) / safeCell);
  const centerX = col * safeCell + safeCell / 2;
  const centerY = row * safeCell + safeCell / 2;
  return { x: centerX, y: centerY };
}

function clampToBed(value: number, max: number, cellSizeCm: number) {
  if (!Number.isFinite(value)) return Math.max(0, Math.min(max, max / 2));
  if (max <= cellSizeCm) {
    return Math.max(0, max / 2);
  }
  const halfCell = cellSizeCm / 2;
  return Math.min(Math.max(value, halfCell), Math.max(halfCell, max - halfCell));
}

export function GardenPlanner({ gardens, plants, focusItems: initialFocus }: GardenPlannerProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedGardenId, setSelectedGardenId] = useState(gardens[0]?.id ?? "");
  const [selectedBedId, setSelectedBedId] = useState(gardens[0]?.beds[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [cellSizeCm, setCellSizeCm] = useState(DEFAULT_CELL_SIZE_CM);
  const [focusItems, setFocusItems] = useState(initialFocus);
  const [showFocusOnly, setShowFocusOnly] = useState(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const bedRef = useRef<HTMLDivElement | null>(null);
  const { pushToast } = useToast();

  const activeGarden = gardens.find((garden) => garden.id === selectedGardenId) ?? gardens[0];
  const activeBed =
    activeGarden?.beds.find((bed) => bed.id === selectedBedId) ?? activeGarden?.beds[0] ?? null;
  const bedWidthCm = activeBed?.widthCm ?? 1;
  const bedLengthCm = activeBed?.lengthCm ?? 1;
  const bedIconSizePx = useMemo(
    () => Math.max(32, Math.min(60, Math.round(Math.min(bedWidthCm, bedLengthCm) / 8))),
    [bedLengthCm, bedWidthCm],
  );

  const bedGrid = useMemo(() => {
    if (!activeBed) return null;
    const safeWidth = Math.max(1, bedWidthCm);
    const safeLength = Math.max(1, bedLengthCm);
    const minorWidthPercent = (cellSizeCm / safeWidth) * 100;
    const minorLengthPercent = (cellSizeCm / safeLength) * 100;
    const majorWidthPercent = ((cellSizeCm * 5) / safeWidth) * 100;
    const majorLengthPercent = ((cellSizeCm * 5) / safeLength) * 100;
    const minorColor = "rgba(148, 163, 184, 0.35)";
    const majorColor = "rgba(59, 130, 246, 0.45)";

    return {
      cellCm: cellSizeCm,
      style: {
        backgroundImage: [
          `repeating-linear-gradient(to right, transparent 0, transparent calc(${minorWidthPercent}% - 0.6px), ${minorColor} calc(${minorWidthPercent}% - 0.6px), ${minorColor} ${minorWidthPercent}%)`,
          `repeating-linear-gradient(to bottom, transparent 0, transparent calc(${minorLengthPercent}% - 0.6px), ${minorColor} calc(${minorLengthPercent}% - 0.6px), ${minorColor} ${minorLengthPercent}%)`,
          `repeating-linear-gradient(to right, transparent 0, transparent calc(${majorWidthPercent}% - 1px), ${majorColor} calc(${majorWidthPercent}% - 1px), ${majorColor} ${majorWidthPercent}%)`,
          `repeating-linear-gradient(to bottom, transparent 0, transparent calc(${majorLengthPercent}% - 1px), ${majorColor} calc(${majorLengthPercent}% - 1px), ${majorColor} ${majorLengthPercent}%)`,
        ].join(", "),
        backgroundSize: "100% 100%",
        backgroundRepeat: "repeat",
      } as CSSProperties,
    };
  }, [activeBed, bedLengthCm, bedWidthCm, cellSizeCm]);

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
    setDragPreview(null);
  }, [selectedBedId, selectedGardenId]);

  useEffect(() => {
    setFocusItems(initialFocus);
  }, [initialFocus]);

  const filteredPlants = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return plants;
    return plants.filter((plant) => plant.name.toLowerCase().includes(keyword));
  }, [plants, query]);

  const focusPlantingIds = useMemo(
    () => new Set(focusItems.filter((item) => item.kind === "planting").map((item) => item.targetId)),
    [focusItems],
  );
  const focusBedIds = useMemo(
    () => new Set(focusItems.filter((item) => item.kind === "bed").map((item) => item.targetId)),
    [focusItems],
  );
  const focusPlantIds = useMemo(
    () => new Set(focusItems.filter((item) => item.kind === "plant").map((item) => item.targetId)),
    [focusItems],
  );

  const displayedPlantings = useMemo(() => {
    if (!activeBed) return [] as PlannerPlanting[];
    if (!showFocusOnly) return activeBed.plantings;
    const isBedFocused = focusBedIds.has(activeBed.id);
    return activeBed.plantings.filter(
      (planting) =>
        isBedFocused ||
        focusPlantingIds.has(planting.id) ||
        focusPlantIds.has(planting.plantId),
    );
  }, [activeBed, focusBedIds, focusPlantIds, focusPlantingIds, showFocusOnly]);

  const isActiveBedFocused = activeBed ? focusBedIds.has(activeBed.id) : false;
  const bedContainerClassName = [
    "relative w-full rounded-lg border-2 bg-slate-50 shadow-[inset_0_0_0_2px_rgba(148,163,184,0.35)]",
    isActiveBedFocused ? "border-primary ring-4 ring-primary/30" : "border-slate-400",
  ].join(" ");

  const toggleFocus = useCallback(
    (kind: PlannerFocusItem["kind"], targetId: string, label?: string) => {
      startTransition(async () => {
        const existing = focusItems.find((item) => item.kind === kind && item.targetId === targetId);
        if (existing) {
          const response = await fetch(`/api/focus/${existing.id}`, { method: "DELETE" });
          if (!response.ok) {
            const data = await response.json().catch(() => ({ error: "Unable to update focus" }));
            pushToast({
              title: "Focus not removed",
              description: typeof data.error === "string" ? data.error : "Unable to update focus",
              variant: "error",
            });
            return;
          }
          setFocusItems((items) => items.filter((item) => item.id !== existing.id));
          pushToast({
            title: "Removed from focus",
            description: "This item will no longer appear in the focus list.",
            variant: "info",
          });
          return;
        }
        const response = await fetch("/api/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, targetId, label, mode: "create" }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Unable to update focus" }));
          pushToast({
            title: "Focus not added",
            description: typeof data.error === "string" ? data.error : "Unable to update focus",
            variant: "error",
          });
          return;
        }
        const json = (await response.json()) as { focus: PlannerFocusItem };
        setFocusItems((items) => [...items, json.focus]);
        pushToast({
          title: "Added to focus",
          description: "We will prioritise this item in digests and alerts.",
          variant: "success",
        });
      });
    },
    [focusItems, pushToast, startTransition],
  );

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
      pushToast({
        title: "Bed details incomplete",
        description: "Add a name and numeric dimensions before creating a bed.",
        variant: "error",
      });
      return;
    }
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
        pushToast({
          title: "Bed could not be added",
          description: typeof data.error === "string" ? data.error : "Unable to add bed",
          variant: "error",
        });
        return;
      }
      formElement.reset();
      pushToast({
        title: "Bed added",
        description: `${name} is now available in ${activeGarden.name}.`,
        variant: "success",
      });
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
      const response = await fetch("/api/plantings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plantingId, positionX: x, positionY: y }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to move planting" }));
        pushToast({
          title: "Could not reposition plant",
          description: typeof data.error === "string" ? data.error : "Unable to move planting",
          variant: "error",
        });
        return;
      }
      pushToast({
        title: "Plant repositioned",
        description: "The plant marker was moved to its new spot.",
        variant: "success",
      });
      router.refresh();
    });
  };

  const handleUpdatePlantingStartDate = (plantingId: string, startDate: string) => {
    startTransition(async () => {
      const response = await fetch("/api/plantings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plantingId, startDate }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to update plant date" }));
        pushToast({
          title: "Could not update plant date",
          description: typeof data.error === "string" ? data.error : "Unable to update plant date",
          variant: "error",
        });
        return;
      }
      pushToast({
        title: "Plant date updated",
        description: "Reminder schedules have been refreshed.",
        variant: "success",
      });
      router.refresh();
    });
  };

  const handleDeletePlanting = (plantingId: string) => {
    startTransition(async () => {
      const response = await fetch(`/api/plantings?id=${encodeURIComponent(plantingId)}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to remove planting" }));
        pushToast({
          title: "Could not remove plant",
          description: typeof data.error === "string" ? data.error : "Unable to remove planting",
          variant: "error",
        });
        return;
      }
      pushToast({
        title: "Plant removed",
        description: "The plant has been cleared from this bed.",
        variant: "info",
      });
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

    startTransition(async () => {
      const response = await fetch(`/api/beds?id=${encodeURIComponent(bedId)}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to remove bed" }));
        pushToast({
          title: "Bed could not be removed",
          description: typeof data.error === "string" ? data.error : "Unable to remove bed",
          variant: "error",
        });
        return;
      }
      const nextBed = activeGarden.beds.find((bed) => bed.id !== bedId);
      pushToast({
        title: "Bed removed",
        description: "The bed and its plantings were deleted.",
        variant: "warning",
      });
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
        pushToast({
          title: "Garden name required",
          description: "Enter at least one character for the garden name.",
          variant: "error",
        });
        return;
      }
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
          pushToast({
            title: "Garden could not be renamed",
            description: typeof data.error === "string" ? data.error : "Unable to rename garden",
            variant: "error",
          });
          return;
        }
        pushToast({
          title: "Garden renamed",
          description: `Garden is now called ${trimmed}.`,
          variant: "success",
        });
        router.refresh();
      });
    },
    [gardens, pushToast, router, startTransition],
  );

  const handleDeleteGarden = useCallback(
    (gardenId: string) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Remove this garden, its beds, and all plantings?");
        if (!confirmed) {
          return;
        }
      }
      const nextGarden = gardens.find((garden) => garden.id !== gardenId);
      startTransition(async () => {
        const response = await fetch(`/api/garden?id=${encodeURIComponent(gardenId)}`, { method: "DELETE" });
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Unable to remove garden" }));
          pushToast({
            title: "Garden could not be removed",
            description: typeof data.error === "string" ? data.error : "Unable to remove garden",
            variant: "error",
          });
          return;
        }
        pushToast({
          title: "Garden removed",
          description: "The garden and all related beds were deleted.",
          variant: "warning",
        });
        setSelectedGardenId(nextGarden?.id ?? "");
        setSelectedBedId(nextGarden?.beds[0]?.id ?? "");
        router.refresh();
      });
    },
    [gardens, pushToast, router, startTransition],
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
      const horizontalSpacing = Math.max(10, spacing.inRow);
      const verticalSpacing = Math.max(10, spacing.between);
      const proximityBuffer = Math.max(6, Math.min(horizontalSpacing, verticalSpacing) / 2);
      const existingPositions: Array<{ x: number; y: number }> = bed.plantings
        .map((planting) => ({
          x: planting.positionX ?? safeWidth / 2,
          y: planting.positionY ?? safeLength / 2,
        }))
        .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
      const positionIsFree = (x: number, y: number) =>
        existingPositions.every((existing) => Math.hypot(existing.x - x, existing.y - y) >= proximityBuffer);
      const registerPlacement = (x: number, y: number) => {
        const roundedX = Math.round(x);
        const roundedY = Math.round(y);
        existingPositions.push({ x: roundedX, y: roundedY });
        basePlacements.push({ positionX: roundedX, positionY: roundedY });
      };
      const clampRow = (value: number) => {
        if (safeLength <= verticalSpacing) {
          const center = clamp(value, safeLength / 2, safeLength / 2);
          return center;
        }
        return clamp(value, verticalSpacing / 2, safeLength - verticalSpacing / 2);
      };
      const clampColumn = (value: number) => {
        if (safeWidth <= horizontalSpacing) {
          const center = clamp(value, safeWidth / 2, safeWidth / 2);
          return center;
        }
        return clamp(value, horizontalSpacing / 2, safeWidth - horizontalSpacing / 2);
      };
      const findAvailableCoordinate = (
        target: number,
        spacingInterval: number,
        clampFn: (value: number) => number,
        isFree: (value: number) => boolean,
        limit: number,
      ) => {
        const clampedTarget = clampFn(target);
        if (isFree(clampedTarget)) {
          return clampedTarget;
        }
        const maxIterations = Math.ceil(limit / spacingInterval) + 2;
        for (let step = 1; step <= maxIterations; step++) {
          const negative = clampFn(clampedTarget - step * spacingInterval);
          if (negative !== clampedTarget && isFree(negative)) {
            return negative;
          }
          const positive = clampFn(clampedTarget + step * spacingInterval);
          if (positive !== clampedTarget && isFree(positive)) {
            return positive;
          }
        }
        return clampedTarget;
      };

      if (mode === "single") {
        const x = clampColumn(pendingPlacement.dropX);
        const y = clampRow(pendingPlacement.dropY);
        if (positionIsFree(x, y)) {
          registerPlacement(x, y);
        }
      } else if (mode === "width") {
        const rowY = findAvailableCoordinate(
          pendingPlacement.dropY,
          verticalSpacing,
          clampRow,
          (candidate) => existingPositions.every((point) => Math.abs(point.y - candidate) >= proximityBuffer),
          safeLength,
        );
        let current = horizontalSpacing / 2;
        while (current <= safeWidth) {
          const candidateX = clampColumn(current);
          if (positionIsFree(candidateX, rowY)) {
            registerPlacement(candidateX, rowY);
          }
          current += horizontalSpacing;
        }
        if (!basePlacements.length) {
          const fallbackX = clampColumn(pendingPlacement.dropX);
          if (positionIsFree(fallbackX, rowY)) {
            registerPlacement(fallbackX, rowY);
          }
        }
      } else {
        const columnX = findAvailableCoordinate(
          pendingPlacement.dropX,
          horizontalSpacing,
          clampColumn,
          (candidate) => existingPositions.every((point) => Math.abs(point.x - candidate) >= proximityBuffer),
          safeWidth,
        );
        let current = verticalSpacing / 2;
        while (current <= safeLength) {
          const candidateY = clampRow(current);
          if (positionIsFree(columnX, candidateY)) {
            registerPlacement(columnX, candidateY);
          }
          current += verticalSpacing;
        }
        if (!basePlacements.length) {
          const fallbackY = clampRow(pendingPlacement.dropY);
          if (positionIsFree(columnX, fallbackY)) {
            registerPlacement(columnX, fallbackY);
          }
        }
      }

      if (!basePlacements.length) {
        pushToast({
          title: "No available space",
          description: "Try another spot or adjust spacing to fit this plant.",
          variant: "error",
        });
        setPendingPlacement(null);
        return;
      }

      pushToast({
        title: basePlacements.length === 1 ? "Plant placed" : "Plants placed",
        description:
          basePlacements.length === 1
            ? `Placed ${pendingPlacement.plant.name}.`
            : `Placed ${basePlacements.length} ${pendingPlacement.plant.name} plants.`,
        variant: "success",
      });

      createPlantings(
        pendingPlacement.bedId,
        pendingPlacement.plant.id,
        basePlacements.map((placement) => ({ positionX: placement.positionX, positionY: placement.positionY })),
      );
      setPendingPlacement(null);
    },
    [createPlantings, getSpacing, pendingPlacement, pushToast, resolveBedById],
  );

  const cancelPlacement = useCallback(() => setPendingPlacement(null), []);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!activeBed) return;
    const rect = bedRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    const xRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const rawX = xRatio * activeBed.widthCm;
    const rawY = yRatio * activeBed.lengthCm;
    const previewMatch = dragPreview && dragPreview.bedId === activeBed.id ? dragPreview : null;
    const snapped = previewMatch ?? {
      ...snapToCellCenter(rawX, rawY, cellSizeCm),
      leftPercent: 0,
      topPercent: 0,
    };
    const xCm = Number(
      clampToBed(previewMatch ? previewMatch.x : snapped.x, activeBed.widthCm, cellSizeCm).toFixed(2),
    );
    const yCm = Number(
      clampToBed(previewMatch ? previewMatch.y : snapped.y, activeBed.lengthCm, cellSizeCm).toFixed(2),
    );
    const plantData = event.dataTransfer.getData("application/garden-plant");
    setDragPreview(null);
    setPendingPlacement(null);
    if (plantData) {
      const payload = JSON.parse(plantData) as { plantId: string };
      const plant = plants.find((item) => item.id === payload.plantId);
      if (!plant) {
        return;
      }
      setPendingPlacement({
        bedId: activeBed.id,
        plant,
        dropX: xCm,
        dropY: yCm,
        leftPercent: (xCm / activeBed.widthCm) * 100,
        topPercent: (yCm / activeBed.lengthCm) * 100,
      });
      return;
    }
    const plantingData = event.dataTransfer.getData("application/garden-planting");
    if (plantingData) {
      const payload = JSON.parse(plantingData) as { plantingId: string };
      handleUpdatePlanting(payload.plantingId, xCm, yCm);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!activeBed) return;
    const rect = bedRef.current?.getBoundingClientRect();
    if (!rect) return;
    const types = Array.from(event.dataTransfer.types ?? []);
    if (!types.includes("application/garden-plant") && !types.includes("application/garden-planting")) {
      setDragPreview(null);
      return;
    }
    event.dataTransfer.dropEffect = types.includes("application/garden-planting") ? "move" : "copy";
    const xRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const yRatio = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const rawX = xRatio * activeBed.widthCm;
    const rawY = yRatio * activeBed.lengthCm;
    const snapped = snapToCellCenter(rawX, rawY, cellSizeCm);
    const x = clampToBed(snapped.x, activeBed.widthCm, cellSizeCm);
    const y = clampToBed(snapped.y, activeBed.lengthCm, cellSizeCm);
    setDragPreview({
      bedId: activeBed.id,
      x,
      y,
      leftPercent: (x / activeBed.widthCm) * 100,
      topPercent: (y / activeBed.lengthCm) * 100,
    });
  };

  const handleDragLeave = () => {
    setDragPreview(null);
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
              {activeBed ? (
                <button
                  type="button"
                  onClick={() => toggleFocus("bed", activeBed.id, activeBed.name)}
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isActiveBedFocused ? "text-primary" : "text-slate-500 hover:text-primary"
                  }`}
                  disabled={isPending}
                >
                  {isActiveBedFocused ? "Unfocus bed" : "Focus bed"}
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700">
              Grid size
              <select
                className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
                value={cellSizeCm}
                onChange={(event) => setCellSizeCm(Math.max(1, Number(event.target.value)))}
              >
                {[5, 10, 15, 20].map((size) => (
                  <option key={size} value={size}>
                    {size} cm
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => focusItems.length && setShowFocusOnly((value) => !value)}
              disabled={!focusItems.length}
              className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                showFocusOnly ? "bg-primary text-white" : "border border-primary text-primary"
              } ${!focusItems.length ? "cursor-not-allowed opacity-40" : ""}`}
            >
              {showFocusOnly ? "Showing focus" : "Focus only"}
            </button>
            {focusItems.length ? (
              <span className="text-xs font-medium text-slate-500">{focusItems.length} focus items</span>
            ) : null}
          </div>
        </div>
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
            <div>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving…" : "Add bed"}
              </Button>
            </div>
          </form>
        ) : null}
        {activeBed ? (
          <div>
            <div className={bedContainerClassName} style={{ paddingBottom: `${(bedLengthCm / bedWidthCm) * 100}%` }}>
              <div
                ref={bedRef}
                data-testid="garden-bed-canvas"
                className="absolute inset-0"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={bedGrid?.style}
              >
                <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                  Width: {bedWidthCm} cm
                </div>
                <div className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 -rotate-90 rounded bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm">
                  Length: {bedLengthCm} cm
                </div>
                {bedGrid ? (
                  <div className="pointer-events-none absolute bottom-2 left-2 z-10 rounded bg-white/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm">
                    Grid: {bedGrid.cellCm}cm
                  </div>
                ) : null}
                {displayedPlantings.map((planting) => {
                  const left = planting.positionX ?? bedWidthCm / 2;
                  const top = planting.positionY ?? bedLengthCm / 2;
                  const leftPercent = (left / bedWidthCm) * 100;
                  const topPercent = (top / bedLengthCm) * 100;
                  const isPlantingFocused =
                    isActiveBedFocused ||
                    focusPlantingIds.has(planting.id) ||
                    focusPlantIds.has(planting.plantId);
                  return (
                    <PlantingMarker
                      key={planting.id}
                      planting={planting}
                      leftPercent={leftPercent}
                      topPercent={topPercent}
                      iconSize={bedIconSizePx}
                      onDelete={handleDeletePlanting}
                      onUpdateStartDate={handleUpdatePlantingStartDate}
                      onToggleFocus={() => toggleFocus("planting", planting.id, planting.plantName)}
                      isFocused={isPlantingFocused}
                      dimmed={!isPlantingFocused && focusItems.length > 0 && !showFocusOnly}
                      bedId={activeBed.id}
                      bedWidthCm={bedWidthCm}
                      bedLengthCm={bedLengthCm}
                      bedRef={bedRef}
                      onDragPreview={(preview) => setDragPreview(preview)}
                      isPending={isPending}
                    />
                  );
                })}
                {dragPreview && dragPreview.bedId === activeBed.id ? (
                  <>
                    <div className="pointer-events-none absolute inset-0">
                      <div
                        className="absolute left-0 h-px w-full border-t border-dashed border-primary/50"
                        style={{ top: `${dragPreview.topPercent}%` }}
                      />
                      <div
                        className="absolute top-0 h-full w-px border-l border-dashed border-primary/50"
                        style={{ left: `${dragPreview.leftPercent}%` }}
                      />
                    </div>
                    <div
                      className="pointer-events-none absolute flex items-center justify-center rounded-full border-2 border-primary/60 bg-primary/10"
                      style={{
                        left: `${dragPreview.leftPercent}%`,
                        top: `${dragPreview.topPercent}%`,
                        width: Math.max(16, bedIconSizePx * 0.6),
                        height: Math.max(16, bedIconSizePx * 0.6),
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  </>
                ) : null}
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
                      data-testid="pending-placement"
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
              data-testid={`plant-card-${plant.id}`}
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

type PlantingMarkerProps = {
  planting: PlannerPlanting;
  leftPercent: number;
  topPercent: number;
  iconSize: number;
  onDelete: (id: string) => void;
  onUpdateStartDate: (id: string, startDate: string) => void;
  onToggleFocus: () => void;
  isFocused: boolean;
  dimmed: boolean;
  bedId: string;
  bedWidthCm: number;
  bedLengthCm: number;
  bedRef: RefObject<HTMLDivElement>;
  onDragPreview: (preview: DragPreview | null) => void;
  isPending: boolean;
};


function PlantingMarker({
  planting,
  leftPercent,
  topPercent,
  iconSize,
  onDelete,
  onUpdateStartDate,
  onToggleFocus,
  isFocused,
  dimmed,
  bedId,
  bedWidthCm,
  bedLengthCm,
  bedRef,
  onDragPreview,
  isPending,
}: PlantingMarkerProps) {
  const startDate = useMemo(() => new Date(planting.startDate), [planting.startDate]);
  const [draftDate, setDraftDate] = useState(startDate.toISOString().slice(0, 10));
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const markerRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    setDraftDate(startDate.toISOString().slice(0, 10));
  }, [startDate]);

  const harvestDate = useMemo(() => {
    if (!planting.daysToMaturity) return null;
    return new Date(startDate.getTime() + planting.daysToMaturity * DAY_IN_MS);
  }, [planting.daysToMaturity, startDate]);

  const harvestDescriptor = useMemo(() => {
    if (!harvestDate) return "No maturity data available";
    const daysRemaining = Math.ceil((harvestDate.getTime() - Date.now()) / DAY_IN_MS);
    if (daysRemaining > 0) {
      return `${DATE_FORMATTER.format(harvestDate)} (${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining)`;
    }
    if (daysRemaining === 0) {
      return `${DATE_FORMATTER.format(harvestDate)} (ready today)`;
    }
    return `${DATE_FORMATTER.format(harvestDate)} (past maturity)`;
  }, [harvestDate]);

  const updatePopoverPosition = useCallback(() => {
    if (!isPopoverOpen) return;
    const bed = bedRef.current;
    const popover = popoverRef.current;
    if (!bed || !popover) return;
    const bedRect = bed.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const markerX = bedRect.left + (leftPercent / 100) * bedRect.width;
    const markerY = bedRect.top + (topPercent / 100) * bedRect.height;
    let left = markerX - popRect.width / 2;
    const minLeft = bedRect.left + 8;
    const maxLeft = bedRect.right - popRect.width - 8;
    if (maxLeft >= minLeft) {
      left = Math.min(Math.max(left, minLeft), maxLeft);
    }
    let top = markerY + 16;
    if (top + popRect.height > bedRect.bottom) {
      top = markerY - popRect.height - 16;
    }
    const minTop = bedRect.top + 8;
    const maxTop = bedRect.bottom - popRect.height - 8;
    if (maxTop >= minTop) {
      top = Math.min(Math.max(top, minTop), maxTop);
    }
    setPopoverPosition({ top, left });
  }, [bedRef, isPopoverOpen, leftPercent, topPercent]);

  useLayoutEffect(() => {
    if (!isPopoverOpen) return;
    updatePopoverPosition();
    const handle = () => updatePopoverPosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [isPopoverOpen, updatePopoverPosition]);

  useEffect(() => {
    if (isPopoverOpen) {
      updatePopoverPosition();
    }
  }, [iconSize, isPopoverOpen, updatePopoverPosition]);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => setIsPopoverOpen(false), 120);
  }, [cancelClose]);

  const openPopover = useCallback(() => {
    cancelClose();
    setIsPopoverOpen(true);
  }, [cancelClose]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && (popoverRef.current?.contains(next) || markerRef.current?.contains(next))) {
      return;
    }
    scheduleClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftDate) {
      return;
    }
    const iso = new Date(`${draftDate}T00:00:00`).toISOString();
    if (iso === planting.startDate) {
      return;
    }
    onUpdateStartDate(planting.id, iso);
  };

  const preview = useMemo(
    () => ({
      bedId,
      x: planting.positionX ?? bedWidthCm / 2,
      y: planting.positionY ?? bedLengthCm / 2,
      leftPercent,
      topPercent,
    }),
    [bedId, bedLengthCm, bedWidthCm, leftPercent, planting.positionX, planting.positionY, topPercent],
  );

  const markerClasses = [
    "flex items-center justify-center rounded-full border border-white bg-white text-xs font-semibold uppercase text-primary shadow cursor-move",
    isFocused ? "ring-2 ring-primary" : "ring-2 ring-slate-200",
    dimmed ? "opacity-70" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        data-testid={`planting-marker-${planting.id}`}
        className={`absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none ${dimmed ? "opacity-75" : ""}`}
        style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
      >
        <div
          ref={markerRef}
          className="relative flex flex-col items-center"
          tabIndex={0}
          onMouseEnter={openPopover}
          onMouseLeave={scheduleClose}
          onFocus={openPopover}
          onBlur={handleBlur}
        >
          <div
            className={markerClasses}
            style={{ width: iconSize, height: iconSize }}
            draggable
            onDragStart={(event) => {
              event.dataTransfer.setData(
                "application/garden-planting",
                JSON.stringify({ plantingId: planting.id }),
              );
              event.dataTransfer.effectAllowed = "move";
              onDragPreview(preview);
            }}
            onDragEnd={() => onDragPreview(null)}
          >
            {planting.imageUrl ? (
              <Image
                src={planting.imageUrl}
                alt={planting.plantName}
                width={iconSize}
                height={iconSize}
                draggable={false}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              planting.plantName.slice(0, 2).toUpperCase()
            )}
          </div>
        </div>
      </div>
      {isPopoverOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popoverRef}
              data-testid="planting-popover"
              className="fixed z-[9999] w-64 max-w-sm space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-left text-slate-700 shadow-xl"
              style={{ top: popoverPosition.top, left: popoverPosition.left }}
              onMouseEnter={openPopover}
              onMouseLeave={scheduleClose}
              onFocus={openPopover}
              onBlur={handleBlur}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {planting.imageUrl ? (
                    <Image
                      src={planting.imageUrl}
                      alt={planting.plantName}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-primary/10 text-xs font-semibold uppercase text-primary">
                      {planting.plantName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{planting.plantName}</p>
                    <p className="text-xs text-slate-500">Planted {DATE_FORMATTER.format(startDate)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleFocus}
                  className={`text-[11px] font-semibold uppercase tracking-wide ${
                    isFocused ? "text-red-500" : "text-primary"
                  }`}
                  disabled={isPending}
                >
                  {isFocused ? "Unfocus" : "Focus"}
                </button>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <p>Harvest ETA: {harvestDescriptor}</p>
                {planting.daysToMaturity ? <p>Days to maturity: {planting.daysToMaturity}</p> : null}
              </div>
              <form onSubmit={handleSubmit} className="space-y-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  Plant date
                  <input
                    type="date"
                    value={draftDate}
                    onChange={(event) => setDraftDate(event.target.value)}
                    disabled={isPending}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </label>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save date
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(planting.id)}
                    className="text-[11px] font-semibold uppercase tracking-wide text-red-500 hover:text-red-600"
                  >
                    Remove plant
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

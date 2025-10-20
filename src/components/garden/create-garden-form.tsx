"use client";

import { FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  convertLengthFromCm,
  convertLengthToCm,
  getLengthStep,
  getLengthUnitSymbol,
  type LengthUnit,
} from "@/src/lib/units";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

type CreateGardenFormProps = {
  lengthUnit: LengthUnit;
};

export function CreateGardenForm({ lengthUnit }: CreateGardenFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();
  const lengthSymbol = getLengthUnitSymbol(lengthUnit);
  const lengthStep = getLengthStep(lengthUnit);
  const formatLengthInput = (cm: number) => {
    const value = convertLengthFromCm(cm, lengthUnit);
    if (!Number.isFinite(value)) return "";
    const precision = lengthUnit === "CENTIMETERS" ? 0 : 2;
    return value.toFixed(precision);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const widthValue = Number(form.get("width"));
    const lengthValue = Number(form.get("length"));
    const heightValue = Number(form.get("height"));
    if (!name || Number.isNaN(widthValue) || Number.isNaN(lengthValue) || Number.isNaN(heightValue)) {
      pushToast({
        title: "Garden details incomplete",
        description: "Please provide a name and numeric dimensions before saving.",
        variant: "error",
      });
      return;
    }
    const widthCm = convertLengthToCm(widthValue, lengthUnit);
    const lengthCm = convertLengthToCm(lengthValue, lengthUnit);
    const heightCm = convertLengthToCm(heightValue, lengthUnit);
    if (!Number.isFinite(widthCm) || !Number.isFinite(lengthCm) || !Number.isFinite(heightCm)) {
      pushToast({
        title: "Garden dimensions invalid",
        description: "Enter numeric measurements for width, length, and bed height.",
        variant: "error",
      });
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/garden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          widthCm: Math.round(widthCm),
          lengthCm: Math.round(lengthCm),
          heightCm: Math.round(heightCm),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to create garden" }));
        pushToast({
          title: "Garden could not be created",
          description: typeof data.error === "string" ? data.error : "Unable to create garden",
          variant: "error",
        });
        return;
      }
      formElement.reset();
      pushToast({
        title: "Garden created",
        description: `${name} is ready for planning.`,
        variant: "success",
      });
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-700">Create a garden</p>
      <label className="space-y-1 text-xs font-medium text-slate-600">
        Name
        <input
          name="name"
          type="text"
          placeholder="e.g. Backyard"
          required
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Width ({lengthSymbol})
          <input
            name="width"
            type="number"
            min={Number(formatLengthInput(100))}
            step={lengthStep}
            defaultValue={formatLengthInput(400)}
            required
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Length ({lengthSymbol})
          <input
            name="length"
            type="number"
            min={Number(formatLengthInput(100))}
            step={lengthStep}
            defaultValue={formatLengthInput(600)}
            required
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Bed height ({lengthSymbol})
          <input
            name="height"
            type="number"
            min={Number(formatLengthInput(10))}
            step={lengthStep}
            defaultValue={formatLengthInput(40)}
            required
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
      </div>
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving…" : "Create garden"}
      </Button>
    </form>
  );
}

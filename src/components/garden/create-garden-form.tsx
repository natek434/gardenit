"use client";

import { FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

export function CreateGardenForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const width = Number(form.get("width"));
    const length = Number(form.get("length"));
    const height = Number(form.get("height"));
    if (!name || Number.isNaN(width) || Number.isNaN(length) || Number.isNaN(height)) {
      pushToast({
        title: "Garden details incomplete",
        description: "Please provide a name and numeric dimensions before saving.",
        variant: "error",
      });
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/garden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, widthCm: width, lengthCm: length, heightCm: height }),
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
          Width (cm)
          <input
            name="width"
            type="number"
            min={100}
            defaultValue={400}
            required
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Length (cm)
          <input
            name="length"
            type="number"
            min={100}
            defaultValue={600}
            required
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-slate-600">
          Bed height (cm)
          <input
            name="height"
            type="number"
            min={10}
            defaultValue={40}
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

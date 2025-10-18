"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { Button } from "../ui/button";

export type SettingsFormProps = {
  user: {
    name: string | null;
    locationLat: number | null;
    locationLon: number | null;
    climateZoneId: string | null;
  } | null;
  zones: Array<{ id: string; name: string; country: string }>;
};

export function SettingsForm({ user, zones }: SettingsFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const zone = String(form.get("climateZoneId") ?? "");
    const latRaw = String(form.get("locationLat") ?? "").trim();
    const lonRaw = String(form.get("locationLon") ?? "").trim();

    const locationLat = latRaw ? Number(latRaw) : null;
    const locationLon = lonRaw ? Number(lonRaw) : null;

    if (latRaw && Number.isNaN(locationLat)) {
      setError("Latitude must be a valid number");
      return;
    }
    if (lonRaw && Number.isNaN(locationLon)) {
      setError("Longitude must be a valid number");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.length ? name : null,
          climateZoneId: zone.length ? zone : null,
          locationLat,
          locationLon,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to save settings" }));
        setError(typeof data.error === "string" ? data.error : "Unable to save settings");
        return;
      }

      setSuccess("Settings updated");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Display name</span>
          <input
            type="text"
            name="name"
            defaultValue={user?.name ?? ""}
            minLength={2}
            maxLength={80}
            placeholder="e.g. Sam Gardner"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Climate zone</span>
          <select
            name="climateZoneId"
            defaultValue={user?.climateZoneId ?? ""}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select a zone</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.country})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Latitude</span>
          <input
            type="text"
            name="locationLat"
            defaultValue={user?.locationLat ?? ""}
            placeholder="-36.8485"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            inputMode="decimal"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-700">Longitude</span>
          <input
            type="text"
            name="locationLon"
            defaultValue={user?.locationLon ?? ""}
            placeholder="174.7633"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            inputMode="decimal"
          />
        </label>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

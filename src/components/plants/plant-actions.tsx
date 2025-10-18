"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";

type PlantActionsProps = {
  plantId: string;
  collections: Array<{ id: string; name: string }>;
};

export function PlantActions({ plantId, collections }: PlantActionsProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const { pushToast } = useToast();

  const handleSave = () => {
    if (!selectedCollectionId) {
      pushToast({
        title: "Choose a collection",
        description: "Select a collection before saving this plant.",
        variant: "warning",
      });
      return;
    }
    startTransition(async () => {
      const response = await fetch(`/api/collections/${selectedCollectionId}/plants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to save plant" }));
        pushToast({
          title: "Plant not saved",
          description: typeof data.error === "string" ? data.error : "Unable to save plant",
          variant: "error",
        });
        return;
      }
      const collectionName = collections.find((collection) => collection.id === selectedCollectionId)?.name;
      pushToast({
        title: "Plant saved",
        description: collectionName ? `Added to ${collectionName}.` : "Saved to collection.",
        variant: "success",
      });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-700">Save to collection</span>
        <select
          value={selectedCollectionId}
          onChange={(event) => setSelectedCollectionId(event.target.value)}
          className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
          Save
        </Button>
      </div>
      <Link href="/garden" className="text-sm font-semibold text-primary hover:underline">
        Add via garden planner
      </Link>
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";

export type CollectionBoardProps = {
  collections: Array<{
    id: string;
    name: string;
    plants: Array<{ id: string; name: string; imageUrl: string | null }>;
  }>;
  plants: Array<{ id: string; name: string; imageUrl: string | null }>;
};

export function CollectionBoard({ collections, plants }: CollectionBoardProps) {
  const router = useRouter();
  const [selectedCollectionId, setSelectedCollectionId] = useState(collections[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredPlants = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return plants;
    return plants.filter((plant) => plant.name.toLowerCase().includes(keyword));
  }, [plants, query]);

  const activeCollection = collections.find((collection) => collection.id === selectedCollectionId) ?? collections[0] ?? null;

  const handleCreateCollection = () => {
    const name = newCollectionName.trim();
    if (name.length < 2) {
      setError("Collection name must be at least 2 characters.");
      return;
    }
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to create collection" }));
        setError(typeof data.error === "string" ? data.error : "Unable to create collection");
        return;
      }
      setNewCollectionName("");
      setMessage("Collection created");
      router.refresh();
    });
  };

  const handleAddToCollection = (plantId: string) => {
    if (!activeCollection) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/collections/${activeCollection.id}/plants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to add plant" }));
        setError(typeof data.error === "string" ? data.error : "Unable to add plant");
        return;
      }
      setMessage("Plant saved to collection");
      router.refresh();
    });
  };

  const handleRemoveFromCollection = (plantId: string) => {
    if (!activeCollection) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/collections/${activeCollection.id}/plants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plantId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to remove plant" }));
        setError(typeof data.error === "string" ? data.error : "Unable to remove plant");
        return;
      }
      setMessage("Plant removed");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Plant collections</h1>
        <p className="text-sm text-slate-600">Curate your favourite varieties without assigning them to a bed.</p>
      </header>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-700">
            Collection
            <select
              className="ml-2 rounded border border-slate-300 px-2 py-1 text-sm"
              value={selectedCollectionId}
              onChange={(event) => setSelectedCollectionId(event.target.value)}
            >
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(event) => setNewCollectionName(event.target.value)}
              placeholder="New collection name"
              className="rounded border border-slate-300 px-2 py-1 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <Button type="button" size="sm" onClick={handleCreateCollection} disabled={isPending}>
              Create
            </Button>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        {activeCollection ? (
          <div className="grid gap-3">
            <p className="text-sm font-semibold text-slate-700">Saved plants</p>
            {activeCollection.plants.length === 0 ? (
              <p className="text-sm text-slate-500">No plants saved yet. Use the search below to add your favourites.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activeCollection.plants.map((plant) => (
                  <div key={plant.id} className="flex items-center gap-3 rounded border border-slate-200 bg-slate-50 p-3">
                    {plant.imageUrl ? (
                      <Image src={plant.imageUrl} alt={plant.name} width={48} height={48} className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-200 text-sm font-semibold text-slate-600">
                        {plant.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex flex-1 items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-700">{plant.name}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCollection(plant.id)}
                        className="text-xs font-semibold uppercase tracking-wide text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Create a collection to start saving plants.</p>
        )}
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Add plants</h2>
          <p className="text-sm text-slate-600">Search the library and save plants without assigning them to a bed.</p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name"
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="grid max-h-[24rem] gap-3 overflow-y-auto pr-1">
          {filteredPlants.map((plant) => (
            <div key={plant.id} className="flex items-center gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm">
              {plant.imageUrl ? (
                <Image src={plant.imageUrl} alt={plant.name} width={48} height={48} className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-slate-100 text-sm font-semibold text-slate-500">
                  {plant.name.charAt(0)}
                </div>
              )}
              <div className="flex flex-1 items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">{plant.name}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddToCollection(plant.id)}
                  disabled={isPending || !activeCollection}
                >
                  Save
                </Button>
              </div>
            </div>
          ))}
          {filteredPlants.length === 0 ? <p className="text-sm text-slate-500">No plants match your search.</p> : null}
        </div>
      </section>
    </div>
  );
}

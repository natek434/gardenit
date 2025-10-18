import { Suspense } from "react";
import { PlantCard } from "@/src/components/plants/plant-card";
import { getPlants } from "@/src/server/plant-service";
import { Skeleton } from "@/src/components/ui/skeleton";
import { PlantIconLegend } from "@/src/components/plants/legend";

export default async function PlantsPage({ searchParams }: { searchParams: { query?: string } }) {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">Plant library</h1>
          <p className="text-sm text-slate-600">Browse crops suited to New Zealand conditions and beyond.</p>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row" role="search">
          <input
            type="search"
            name="query"
            defaultValue={searchParams.query}
            placeholder="Search by name or category"
            className="w-full rounded border border-slate-300 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-light"
          >
            Search
          </button>
        </form>
      </header>
      <PlantIconLegend />
      <Suspense key={searchParams.query} fallback={<PlantsFallback />}>
        <PlantsGrid query={searchParams.query} />
      </Suspense>
    </div>
  );
}

async function PlantsGrid({ query }: { query?: string }) {
  const plants = await getPlants({ query: query || undefined });
  if (plants.length === 0) {
    return <p className="text-sm text-slate-500">No plants match your filters yet.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plants.map((plant) => (
        <PlantCard key={plant.id} plant={plant} />
      ))}
    </div>
  );
}

function PlantsFallback() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-40 rounded-lg" />
      ))}
    </div>
  );
}

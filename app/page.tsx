import Link from "next/link";
import { getPlants } from "@/src/server/plant-service";
import { PlantCard } from "@/src/components/plants/plant-card";
import { Button } from "@/src/components/ui/button";

export default async function HomePage() {
  const plants = await getPlants();
  const sowNow = plants.filter((plant) => plant.status.status === "NOW").slice(0, 6);

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-slate-200 bg-white px-8 py-12 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Grow smarter with Gardenit</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Discover plants that thrive in your climate, receive tailored care plans, and keep your beds productive year-round.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/plants">
            <Button>Browse plants</Button>
          </Link>
          <Link href="/garden">
            <Button variant="secondary">Plan your beds</Button>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Sow now in your zone</h2>
          <Link href="/plants" className="text-sm text-primary hover:underline">
            View all plants
          </Link>
        </div>
        {sowNow.length ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sowNow.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600">No immediate sowing opportunities. Check back soon!</p>
        )}
      </section>
    </div>
  );
}

import { auth } from "@/src/lib/auth/options";
import { getPlantingsByUser } from "@/src/server/garden-service";
import { getPlants } from "@/src/server/plant-service";
import { Button } from "@/src/components/ui/button";

export default async function GardenPage() {
  const session = await auth();
  const plantings = session?.user?.id ? await getPlantingsByUser(session.user.id) : [];
  const plants = await getPlants();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">My garden</h1>
        <p className="text-sm text-slate-600">
          Track plantings, plan bed layouts, and ensure companions thrive together. Sign in to save your layout.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Bed planner</h2>
        <p className="mt-1 text-sm text-slate-600">
          Drag-and-drop planning is coming soon. For now, review suggested spacings and companion relationships.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {plants.slice(0, 6).map((plant) => (
            <div key={plant.id} className="rounded border border-slate-200 p-4">
              <h3 className="font-medium text-slate-800">{plant.commonName}</h3>
              <p className="text-xs text-slate-500">
                Spacing: {plant.spacingInRowCm ?? "--"}cm × {plant.spacingBetweenRowsCm ?? "--"}cm
              </p>
              <p className="mt-2 text-xs text-slate-500">Status: {plant.status.status}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent plantings</h2>
          <Button variant="secondary" disabled>
            Add planting
          </Button>
        </div>
        {plantings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No plantings yet. Sign in and add your beds to start receiving reminders.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {plantings.map((planting) => (
              <li key={planting.id} className="rounded border border-slate-200 p-4">
                <p className="font-medium text-slate-800">{planting.plant.commonName}</p>
                <p className="text-xs text-slate-500">
                  Started {planting.startDate.toDateString()} in bed {planting.bed.name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

import Link from "next/link";
import { auth } from "@/src/lib/auth/options";
import { getGardensForUser } from "@/src/server/garden-service";
import { getPlants } from "@/src/server/plant-service";
import { GardenPlanner } from "@/src/components/garden/garden-planner";
import { CreateGardenForm } from "@/src/components/garden/create-garden-form";

export default async function GardenPage() {
  const session = await auth();
  const gardens = session?.user?.id ? await getGardensForUser(session.user.id) : [];
  const plants = await getPlants();

  const plannerGardens = gardens.map((garden) => ({
    id: garden.id,
    name: garden.name,
    widthCm: garden.widthCm,
    lengthCm: garden.lengthCm,
    heightCm: garden.heightCm,
    beds: garden.beds.map((bed) => ({
      id: bed.id,
      name: bed.name,
      widthCm: bed.widthCm,
      lengthCm: bed.lengthCm,
      heightCm: bed.heightCm,
      plantings: bed.plantings.map((planting) => ({
        id: planting.id,
        plantId: planting.plantId,
        plantName: planting.plant.commonName,
        imageUrl:
          planting.plant.imageLocalPath ??
          resolvePlantImage(planting.plant.defaultImage as Record<string, unknown> | null),
        startDate: planting.startDate.toISOString(),
        positionX: planting.positionX,
        positionY: planting.positionY,
      })),
    })),
  }));

  const plannerPlants = plants.slice(0, 100).map((plant) => ({
    id: plant.id,
    name: plant.commonName,
    imageUrl: plant.imageLocalPath ?? resolvePlantImage(plant.defaultImage as Record<string, unknown> | null),
    spacingInRowCm: plant.spacingInRowCm,
    spacingBetweenRowsCm: plant.spacingBetweenRowsCm,
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">My garden</h1>
        <p className="text-sm text-slate-600">
          Track plantings, plan bed layouts, and ensure companions thrive together. Sign in to save your layout.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Interactive bed planner</h2>
          {!session?.user ? (
            <Link href="/auth/signin" className="text-sm font-semibold text-primary hover:underline">
              Sign in to save
            </Link>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Drag plants from the library onto your beds to create plantings and adjust their layout.
        </p>
        {session?.user?.id ? (
          plannerGardens.length ? (
            <div className="mt-6">
              <div className="space-y-8">
                <GardenPlanner gardens={plannerGardens} plants={plannerPlants} />
                <CreateGardenForm />
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-slate-600">No gardens yet. Create your first garden to start planning layouts.</p>
              <CreateGardenForm />
            </div>
          )
        ) : (
          <div className="mt-4 rounded border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
            Sign in to turn on drag-and-drop planning and save plantings across devices.
          </div>
        )}
      </section>
    </div>
  );
}

function resolvePlantImage(image: Record<string, unknown> | null): string | null {
  if (!image) return null;
  const candidates = ["thumbnail", "small_url", "medium_url", "regular_url", "original_url"];
  for (const key of candidates) {
    const value = image[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

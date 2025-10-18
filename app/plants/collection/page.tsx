import Link from "next/link";
import { auth } from "@/src/lib/auth/options";
import { getCollectionsForUser } from "@/src/server/collection-service";
import { getPlants } from "@/src/server/plant-service";
import { CollectionBoard } from "@/src/components/plants/collection-board";

export const metadata = {
  title: "My collections • Gardenit",
};

export default async function CollectionPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold">Build collections with a Gardenit account</h1>
        <p className="text-sm text-slate-600">
          Sign in to save favourite plants, plan succession crops, and share lists with your gardening partners.
        </p>
        <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  const [collections, plants] = await Promise.all([
    getCollectionsForUser(session.user.id),
    getPlants(),
  ]);

  const mappedCollections = collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    plants: collection.plants.map((entry) => ({
      id: entry.plant.id,
      name: entry.plant.commonName,
      imageUrl: entry.plant.imageLocalPath ?? resolvePlantImage(entry.plant.defaultImage as Record<string, unknown> | null),
    })),
  }));

  const mappedPlants = plants.slice(0, 120).map((plant) => ({
    id: plant.id,
    name: plant.commonName,
    imageUrl: plant.imageLocalPath ?? resolvePlantImage(plant.defaultImage as Record<string, unknown> | null),
  }));

  return <CollectionBoard collections={mappedCollections} plants={mappedPlants} />;
}

function resolvePlantImage(image: Record<string, unknown> | null): string | null {
  if (!image) return null;
  const candidates = ["thumbnail", "small_url", "medium_url", "regular_url", "original_url"];
  for (const key of candidates) {
    const value = image[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

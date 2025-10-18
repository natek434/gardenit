import { notFound } from "next/navigation";
import { PlantDetail } from "@/src/components/plants/plant-detail";
import { getPlant } from "@/src/server/plant-service";
import { auth } from "@/src/lib/auth/options";
import { getCollectionsForUser } from "@/src/server/collection-service";
import { getFocusItemsByUser } from "@/src/server/focus-service";

export default async function PlantPage({ params }: { params: { id: string } }) {
  const plant = await getPlant(params.id);
  const session = await auth();
  const collections = session?.user?.id
    ? (await getCollectionsForUser(session.user.id)).map((collection) => ({ id: collection.id, name: collection.name }))
    : undefined;
  if (!plant) return notFound();
  const focusItems = session?.user?.id ? await getFocusItemsByUser(session.user.id) : [];
  const focusForPlant = focusItems.find((item) => item.kind === "plant" && item.targetId === plant.id);
  return <PlantDetail plant={plant} collections={collections} focusId={focusForPlant?.id ?? null} />;
}

import { notFound } from "next/navigation";
import { PlantDetail } from "@/src/components/plants/plant-detail";
import { getPlant } from "@/src/server/plant-service";

export default async function PlantPage({ params }: { params: { id: string } }) {
  const plant = await getPlant(params.id);
  if (!plant) return notFound();
  return <PlantDetail plant={plant} />;
}

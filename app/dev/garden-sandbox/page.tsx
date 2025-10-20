import { notFound } from "next/navigation";
import { GardenPlanner } from "@/src/components/garden/garden-planner";
import { DEFAULT_MEASUREMENT_PREFERENCES } from "@/src/lib/units";

const demoGardens = [
  {
    id: "demo-garden",
    name: "Demo Garden",
    widthCm: 200,
    lengthCm: 300,
    heightCm: 40,
    beds: [
      {
        id: "demo-bed",
        name: "Demo Bed",
        widthCm: 200,
        lengthCm: 300,
        heightCm: 40,
        plantings: [
          {
            id: "demo-planting",
            plantId: "demo-plant",
            plantName: "Lettuce",
            imageUrl: null,
            startDate: new Date("2024-03-01T00:00:00Z").toISOString(),
            daysToMaturity: 60,
            positionX: 100,
            positionY: 150,
            notes: "Trialing early spring lettuce here.",
          },
          {
            id: "edge-nw",
            plantId: "demo-plant",
            plantName: "Lettuce",
            imageUrl: null,
            startDate: new Date("2024-03-05T00:00:00Z").toISOString(),
            daysToMaturity: 50,
            positionX: 5,
            positionY: 5,
            notes: null,
          },
          {
            id: "edge-ne",
            plantId: "demo-plant",
            plantName: "Lettuce",
            imageUrl: null,
            startDate: new Date("2024-03-10T00:00:00Z").toISOString(),
            daysToMaturity: 55,
            positionX: 195,
            positionY: 5,
            notes: null,
          },
          {
            id: "edge-sw",
            plantId: "demo-plant",
            plantName: "Lettuce",
            imageUrl: null,
            startDate: new Date("2024-03-15T00:00:00Z").toISOString(),
            daysToMaturity: 52,
            positionX: 5,
            positionY: 295,
            notes: null,
          },
          {
            id: "edge-se",
            plantId: "demo-plant",
            plantName: "Lettuce",
            imageUrl: null,
            startDate: new Date("2024-03-20T00:00:00Z").toISOString(),
            daysToMaturity: 58,
            positionX: 195,
            positionY: 295,
            notes: null,
          },
        ],
      },
    ],
  },
];

const demoPlants = [
  {
    id: "demo-plant",
    name: "Lettuce",
    imageUrl: null,
    spacingInRowCm: 30,
    spacingBetweenRowsCm: 30,
  },
  {
    id: "demo-tomato",
    name: "Tomato",
    imageUrl: null,
    spacingInRowCm: 45,
    spacingBetweenRowsCm: 60,
  },
];

const demoFocus = [
  { id: "focus-bed", kind: "bed" as const, targetId: "demo-bed", label: "Demo Bed" },
];

export default function GardenSandboxPage() {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Garden planner sandbox</h1>
      <GardenPlanner
        gardens={demoGardens}
        plants={demoPlants}
        focusItems={demoFocus}
        measurement={DEFAULT_MEASUREMENT_PREFERENCES}
      />
    </div>
  );
}

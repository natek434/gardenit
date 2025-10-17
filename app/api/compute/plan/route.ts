import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { getWeatherProvider } from "@/src/lib/weather/provider";
import { getSeasonality } from "@/src/lib/seasonality";

const payloadSchema = z.object({
  plantId: z.string(),
  climateZoneId: z.string(),
  startDate: z
    .string()
    .transform((value) => new Date(value))
    .refine((date) => !Number.isNaN(date.getTime()), "Invalid date"),
});

export async function POST(request: Request) {
  const json = await request.json();
  const result = payloadSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }
  const plant = await prisma.plant.findUnique({ where: { id: result.data.plantId } });
  if (!plant) {
    return NextResponse.json({ error: "Plant not found" }, { status: 404 });
  }
  const status = await getSeasonality(result.data.startDate, result.data.climateZoneId, plant.id);
  const provider = getWeatherProvider();
  const weather = await provider.getForecast(0, 0);
  const soilTemp = await provider.getSoilTemp(0, 0);
  const frostRisk = await provider.getFrostRisk(0, 0, result.data.startDate);

  const plan = {
    plant: {
      id: plant.id,
      name: plant.commonName,
    },
    status,
    soilTemperature: soilTemp,
    forecast: weather,
    frostRisk,
    tasks: [
      {
        title: "Prepare soil",
        dueAt: result.data.startDate,
        description: plant.soilNotes ?? "Incorporate compost and loosen soil.",
      },
      {
        title: "Watering cadence",
        dueAt: result.data.startDate,
        description: plant.waterGeneral,
      },
      {
        title: "Fertiliser",
        dueAt: new Date(result.data.startDate.getTime() + 1000 * 60 * 60 * 24 * 21),
        description: "Apply balanced fertiliser after establishment.",
      },
    ],
  };

  return NextResponse.json({ plan });
}

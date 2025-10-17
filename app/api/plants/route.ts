import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlants } from "@/src/server/plant-service";

const querySchema = z.object({
  searchParams: z.object({
    query: z.string().optional(),
    zoneId: z.string().optional(),
  }),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parseResult = querySchema.safeParse({
    searchParams: Object.fromEntries(url.searchParams.entries()),
  });
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.format() }, { status: 400 });
  }
  const { query, zoneId } = parseResult.data.searchParams;
  const plants = await getPlants({ query: query || undefined, climateZoneId: zoneId || undefined }, zoneId || undefined);
  return NextResponse.json({ plants });
}

import { NextResponse } from "next/server";
import { getClimateZones } from "@/src/server/climate-service";

export async function GET() {
  const zones = await getClimateZones();
  return NextResponse.json({ zones });
}

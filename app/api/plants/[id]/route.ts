import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlant } from "@/src/server/plant-service";

const paramsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  searchParams: z.object({
    zoneId: z.string().optional(),
  }),
});

export async function GET(request: Request, context: { params: { id: string } }) {
  const url = new URL(request.url);
  const parseResult = paramsSchema.safeParse({
    params: context.params,
    searchParams: Object.fromEntries(url.searchParams.entries()),
  });
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.format() }, { status: 400 });
  }
  const { id } = parseResult.data.params;
  const { zoneId } = parseResult.data.searchParams;
  const plant = await getPlant(id, zoneId);
  if (!plant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ plant });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCompatibility } from "@/src/server/compatibility-service";

const querySchema = z.object({
  plants: z.array(z.string()).min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const plants = url.searchParams.getAll("plants[]");
  const result = querySchema.safeParse({ plants });
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }
  const compatibility = await getCompatibility(result.data.plants);
  return NextResponse.json({ compatibility });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { createPlanting, getPlantingsByUser } from "@/src/server/garden-service";

const postSchema = z.object({
  bedId: z.string(),
  plantId: z.string(),
  startDate: z
    .string()
    .transform((value) => new Date(value))
    .refine((date) => !Number.isNaN(date.getTime()), "Invalid date"),
  quantity: z.coerce.number().int().positive().optional(),
  notes: z.string().optional(),
});

const querySchema = z.object({
  searchParams: z.object({
    user: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  const result = postSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }
  const planting = await createPlanting(
    result.data.bedId,
    result.data.plantId,
    result.data.startDate,
    result.data.quantity,
    result.data.notes,
  );
  return NextResponse.json({ planting });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ searchParams: Object.fromEntries(url.searchParams.entries()) });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const session = await auth();
  const userId = parsed.data.searchParams.user ?? session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const plantings = await getPlantingsByUser(userId);
  return NextResponse.json({ plantings });
}

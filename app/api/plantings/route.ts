import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { createPlanting, deletePlanting, getPlantingsByUser, updatePlantingLayout } from "@/src/server/garden-service";

const postSchema = z.object({
  bedId: z.string(),
  plantId: z.string(),
  startDate: z
    .string()
    .transform((value) => new Date(value))
    .refine((date) => !Number.isNaN(date.getTime()), "Invalid date"),
  quantity: z.coerce.number().int().positive().optional(),
  notes: z.string().optional(),
  positionX: z.number().finite().optional(),
  positionY: z.number().finite().optional(),
  spanWidth: z.number().finite().positive().optional(),
  spanHeight: z.number().finite().positive().optional(),
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
    {
      positionX: result.data.positionX ?? null,
      positionY: result.data.positionY ?? null,
      spanWidth: result.data.spanWidth ?? null,
      spanHeight: result.data.spanHeight ?? null,
    },
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

const patchSchema = z.object({
  id: z.string(),
  positionX: z.number().finite(),
  positionY: z.number().finite(),
  spanWidth: z.number().finite().positive().optional(),
  spanHeight: z.number().finite().positive().optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const planting = await updatePlantingLayout(parsed.data.id, {
    positionX: parsed.data.positionX,
    positionY: parsed.data.positionY,
    spanWidth: parsed.data.spanWidth,
    spanHeight: parsed.data.spanHeight,
  });
  return NextResponse.json({ planting });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const planting = await deletePlanting(id, session.user.id);
  if (!planting) {
    return NextResponse.json({ error: "Planting not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

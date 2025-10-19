import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import {
  createPlanting,
  deletePlanting,
  getPlantingsByUser,
  updatePlantingDetails,
  updatePlantingLayout,
} from "@/src/server/garden-service";

const placementSchema = z.object({
  positionX: z.number().finite(),
  positionY: z.number().finite(),
  spanWidth: z.number().finite().positive().optional(),
  spanHeight: z.number().finite().positive().optional(),
});

const postSchema = z
  .object({
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
    placements: z.array(placementSchema).min(1).optional(),
  })
  .refine(
    (data) =>
      Array.isArray(data.placements)
        ? true
        : typeof data.positionX === "number" && typeof data.positionY === "number",
    {
      message: "Provide either placements array or a single position",
      path: ["placements"],
    },
  );

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
  const placements = result.data.placements
    ? result.data.placements
    : [
        {
          positionX: result.data.positionX!,
          positionY: result.data.positionY!,
          spanWidth: result.data.spanWidth,
          spanHeight: result.data.spanHeight,
        },
      ];

  const plantings = await Promise.all(
    placements.map((placement) =>
      createPlanting(
        result.data.bedId,
        result.data.plantId,
        result.data.startDate,
        result.data.quantity,
        result.data.notes,
        {
          positionX: placement.positionX,
          positionY: placement.positionY,
          spanWidth: placement.spanWidth ?? null,
          spanHeight: placement.spanHeight ?? null,
        },
      ),
    ),
  );

  return NextResponse.json({ plantings });
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

const patchSchema = z
  .object({
    id: z.string(),
    positionX: z.number().finite().optional(),
    positionY: z.number().finite().optional(),
    spanWidth: z.number().finite().positive().optional(),
    spanHeight: z.number().finite().positive().optional(),
    startDate: z
      .string()
      .transform((value) => new Date(value))
      .refine((date) => !Number.isNaN(date.getTime()), "Invalid date")
      .optional(),
    quantity: z.coerce.number().int().positive().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasPosition = typeof data.positionX === "number" && typeof data.positionY === "number";
      const hasDetails = data.startDate || typeof data.quantity === "number" || typeof data.notes === "string";
      return hasPosition || hasDetails;
    },
    { message: "Provide fields to update", path: ["id"] },
  );

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
  const hasPosition = typeof parsed.data.positionX === "number" && typeof parsed.data.positionY === "number";
  if (hasPosition) {
    const planting = await updatePlantingLayout(parsed.data.id, {
      positionX: parsed.data.positionX!,
      positionY: parsed.data.positionY!,
      spanWidth: parsed.data.spanWidth,
      spanHeight: parsed.data.spanHeight,
    });
    return NextResponse.json({ planting });
  }

  const planting = await updatePlantingDetails(parsed.data.id, {
    startDate: parsed.data.startDate,
    quantity: parsed.data.quantity,
    notes: parsed.data.notes,
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

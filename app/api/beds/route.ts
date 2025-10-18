import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { prisma } from "@/src/lib/prisma";
import { createBed, deleteBed } from "@/src/server/garden-service";

const schema = z.object({
  gardenId: z.string(),
  name: z.string().min(2).max(80),
  widthCm: z.coerce.number().int().positive(),
  lengthCm: z.coerce.number().int().positive(),
  heightCm: z.coerce.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const garden = await prisma.garden.findFirst({
    where: { id: parsed.data.gardenId, userId: session.user.id },
    select: { id: true },
  });
  if (!garden) {
    return NextResponse.json({ error: "Garden not found" }, { status: 404 });
  }
  const bed = await createBed(garden.id, {
    name: parsed.data.name,
    widthCm: parsed.data.widthCm,
    lengthCm: parsed.data.lengthCm,
    heightCm: parsed.data.heightCm,
  });
  return NextResponse.json({ bed });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bedId = searchParams.get("id");
  if (!bedId) {
    return NextResponse.json({ error: "Bed id is required" }, { status: 400 });
  }

  const removed = await deleteBed(bedId, session.user.id);
  if (!removed) {
    return NextResponse.json({ error: "Bed not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

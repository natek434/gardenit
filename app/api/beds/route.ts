import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { prisma } from "@/src/lib/prisma";
import { createBed } from "@/src/server/garden-service";

const schema = z.object({
  gardenId: z.string(),
  name: z.string().min(2).max(80),
  widthCm: z.coerce.number().int().positive(),
  heightCm: z.coerce.number().int().positive(),
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
    heightCm: parsed.data.heightCm,
  });
  return NextResponse.json({ bed });
}

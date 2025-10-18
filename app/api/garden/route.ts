import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { deleteGarden, upsertGarden } from "@/src/server/garden-service";

const payloadSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  widthCm: z.coerce.number().int().positive(),
  lengthCm: z.coerce.number().int().positive(),
  heightCm: z.coerce.number().int().positive().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  const result = payloadSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }
  const garden = await upsertGarden(session.user.id, result.data);
  return NextResponse.json({ garden });
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

  const removed = await deleteGarden(id, session.user.id);
  if (!removed) {
    return NextResponse.json({ error: "Garden not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

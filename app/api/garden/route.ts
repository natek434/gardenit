import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { upsertGarden } from "@/src/server/garden-service";

const payloadSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  widthCm: z.coerce.number().int().positive(),
  heightCm: z.coerce.number().int().positive(),
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

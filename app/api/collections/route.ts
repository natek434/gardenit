import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { createCollection, getCollectionsForUser } from "@/src/server/collection-service";

const createSchema = z.object({
  name: z.string().min(2).max(80),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const collections = await getCollectionsForUser(session.user.id);
  return NextResponse.json({ collections });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const collection = await createCollection(session.user.id, parsed.data.name);
  return NextResponse.json({ collection }, { status: 201 });
}

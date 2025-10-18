import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import {
  createCollection,
  deleteCollection,
  getCollectionsForUser,
  renameCollection,
} from "@/src/server/collection-service";

const createSchema = z.object({
  name: z.string().min(2).max(80),
});

const updateSchema = z.object({
  id: z.string(),
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

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  try {
    const collection = await renameCollection(parsed.data.id, session.user.id, parsed.data.name);
    return NextResponse.json({ collection });
  } catch (error) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
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
  try {
    await deleteCollection(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
}

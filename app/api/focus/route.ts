import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { createFocusItem, getFocusItemsByUser, upsertFocusItem } from "@/src/server/focus-service";

const getSchema = z.object({
  user: z.string().optional(),
});

const postSchema = z.object({
  kind: z.enum(["planting", "bed", "plant", "task"]),
  targetId: z.string(),
  label: z.string().optional(),
  mode: z.enum(["create", "update"]).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = getSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const session = await auth();
  const userId = parsed.data.user ?? session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const focus = await getFocusItemsByUser(userId);
  return NextResponse.json({ focus });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const data = parsed.data.mode === "update"
    ? await upsertFocusItem(session.user.id, parsed.data)
    : await createFocusItem(session.user.id, parsed.data);
  return NextResponse.json({ focus: data });
}

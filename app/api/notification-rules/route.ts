import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import {
  createNotificationRule,
  getNotificationRulesByUser,
} from "@/src/server/notification-rule-service";

const getSchema = z.object({
  user: z.string().optional(),
});

const postSchema = z.object({
  name: z.string(),
  type: z.enum(["time", "weather", "soil", "phenology", "garden"]),
  schedule: z.string().optional(),
  params: z.record(z.any()),
  throttleSecs: z.number().int().positive().optional(),
  isEnabled: z.boolean().optional(),
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
  const rules = await getNotificationRulesByUser(userId);
  return NextResponse.json({ rules });
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
  const rule = await createNotificationRule(session.user.id, parsed.data);
  return NextResponse.json({ rule });
}

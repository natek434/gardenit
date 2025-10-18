import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import {
  deleteNotificationRule,
  updateNotificationRule,
} from "@/src/server/notification-rule-service";

const patchSchema = z.object({
  name: z.string().optional(),
  schedule: z.string().nullable().optional(),
  params: z.record(z.any()).optional(),
  throttleSecs: z.number().int().positive().optional(),
  isEnabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const rule = await updateNotificationRule(session.user.id, params.id, parsed.data);
  return NextResponse.json({ rule });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const removed = await deleteNotificationRule(session.user.id, params.id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ rule: removed });
}

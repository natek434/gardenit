import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { clearNotification, markNotificationRead } from "@/src/server/notification-service";

const patchSchema = z.object({
  read: z.boolean().optional(),
  clear: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: { notificationId: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const { read, clear } = parsed.data;
  if (!read && !clear) {
    return NextResponse.json({ error: "No changes requested" }, { status: 400 });
  }

  const userId = session.user.id;
  let updated = null;
  if (clear) {
    updated = await clearNotification(userId, params.notificationId);
  } else if (read) {
    updated = await markNotificationRead(userId, params.notificationId);
  }
  if (!updated) {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json({
    notification: {
      id: params.notificationId,
      readAt: updated.readAt ? updated.readAt.toISOString() : null,
      clearedAt: updated.clearedAt ? updated.clearedAt.toISOString() : null,
    },
  });
}

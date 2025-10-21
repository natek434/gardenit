import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/options";
import { markAllNotificationsRead } from "@/src/server/notification-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await markAllNotificationsRead(session.user.id);
  return NextResponse.json({ updated: result.count });
}

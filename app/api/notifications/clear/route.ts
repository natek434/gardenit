import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/options";
import { clearAllNotifications } from "@/src/server/notification-service";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await clearAllNotifications(session.user.id);
  return NextResponse.json({ cleared: result.count });
}

import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/options";
import { getNotificationSummary } from "@/src/server/notification-service";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 5;
  const take = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 25) : 5;
  const summary = await getNotificationSummary(session.user.id, take);
  return NextResponse.json({
    notifications: summary.notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      severity: notification.severity,
      channel: notification.channel,
      dueAt: notification.dueAt.toISOString(),
      readAt: notification.readAt ? notification.readAt.toISOString() : null,
      ruleName: notification.rule?.name ?? null,
    })),
    unreadCount: summary.unreadCount,
  });
}

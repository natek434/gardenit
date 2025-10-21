import { auth } from "@/src/lib/auth/options";
import { ConditionalRuleManager } from "@/src/components/reminders/conditional-rule-manager";
import { getNotificationRulesByUser } from "@/src/server/notification-rule-service";
import { getNotificationsByUser } from "@/src/server/notification-service";
import { NotificationFeed } from "@/src/components/notifications/notification-feed";

type NotificationsPageProps = {
  searchParams?: { focus?: string };
};

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Smart notifications</h1>
        <p className="text-sm text-slate-600">Sign in to create personalised care reminders.</p>
      </div>
    );
  }
  const [rules, notifications] = await Promise.all([
    getNotificationRulesByUser(session.user.id),
    getNotificationsByUser(session.user.id),
  ]);
  const conditionalRules = rules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    type: rule.type,
    schedule: rule.schedule,
    params: JSON.parse(JSON.stringify(rule.params ?? {})) as Record<string, unknown>,
    throttleSecs: rule.throttleSecs,
    isEnabled: rule.isEnabled,
  }));

  const notificationEntries = notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    body: notification.body,
    severity: notification.severity,
    channel: notification.channel,
    dueAt: notification.dueAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    ruleName: notification.rule?.name ?? null,
    meta: notification.meta ? JSON.parse(JSON.stringify(notification.meta)) : null,
  }));

  const focusId = typeof searchParams?.focus === "string" ? searchParams?.focus : undefined;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Smart notifications</h1>
        <p className="text-sm text-slate-600">
          Review recent alerts, build conditional rules, and fine-tune proactive tasks for soil care, plant
          health, and seasonal monitoring.
        </p>
      </header>
      <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-800">Notification activity</h2>
          <p className="text-sm text-slate-600">
            Review notifications by rule, mark alerts as read, or clear items you no longer need.
          </p>
        </div>
        <NotificationFeed notifications={notificationEntries} initialFocusId={focusId} />
      </section>
      <ConditionalRuleManager initialRules={conditionalRules} />
    </div>
  );
}

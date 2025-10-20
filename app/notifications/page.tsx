import { auth } from "@/src/lib/auth/options";
import { getRemindersByUser } from "@/src/server/reminder-service";
import { ConditionalRuleManager } from "@/src/components/reminders/conditional-rule-manager";
import { SmartNotificationManager } from "@/src/components/reminders/smart-notification-manager";
import { getNotificationRulesByUser } from "@/src/server/notification-rule-service";
import { getNotificationsByUser } from "@/src/server/notification-service";
import { NotificationFeed } from "@/src/components/notifications/notification-feed";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Smart notifications</h1>
        <p className="text-sm text-slate-600">Sign in to create personalised care reminders.</p>
      </div>
    );
  }
  const [reminders, rules, notifications] = await Promise.all([
    getRemindersByUser(session.user.id),
    getNotificationRulesByUser(session.user.id),
    getNotificationsByUser(session.user.id),
  ]);
  const smartReminders = reminders
    .filter((reminder) => reminder.type.startsWith("smart") || reminder.type === "weather-watering")
    .map((reminder) => ({
      id: reminder.id,
      title: reminder.title,
      details: reminder.details ?? null,
      dueAt: reminder.dueAt.toISOString(),
      cadence: reminder.cadence ?? null,
      type: reminder.type,
      sentAt: reminder.sentAt ? reminder.sentAt.toISOString() : null,
    }));

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
    meta: notification.meta ? JSON.parse(JSON.stringify(notification.meta)) : null,
  }));

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
            Filter in-app, email, and push messages Gardenit recorded for your account.
          </p>
        </div>
        <NotificationFeed notifications={notificationEntries} />
      </section>
      <ConditionalRuleManager initialRules={conditionalRules} />
      <SmartNotificationManager initialReminders={smartReminders} />
    </div>
  );
}

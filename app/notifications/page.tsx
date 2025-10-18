import { auth } from "@/src/lib/auth/options";
import { getRemindersByUser } from "@/src/server/reminder-service";
import { ConditionalRuleManager } from "@/src/components/reminders/conditional-rule-manager";
import { SmartNotificationManager } from "@/src/components/reminders/smart-notification-manager";
import { getNotificationRulesByUser } from "@/src/server/notification-rule-service";

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
  const reminders = await getRemindersByUser(session.user.id);
  const rules = await getNotificationRulesByUser(session.user.id);
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

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Smart notifications</h1>
        <p className="text-sm text-slate-600">
          Create proactive tasks for soil care, plant health, and seasonal monitoring. We’ll keep an eye on
          the weather and send tailored reminders.
        </p>
      </header>
      <ConditionalRuleManager initialRules={conditionalRules} />
      <SmartNotificationManager initialReminders={smartReminders} />
    </div>
  );
}

import { prisma } from "@/src/lib/prisma";

export type NotificationPreferenceSnapshot = {
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailDigestHour: number;
  emailDigestTimezone: string | null;
  dndEnabled: boolean;
  dndStartHour: number | null;
  dndEndHour: number | null;
};

const DEFAULT_PREFERENCES: NotificationPreferenceSnapshot = {
  userId: "",
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
  emailDigestHour: 7,
  emailDigestTimezone: null,
  dndEnabled: false,
  dndStartHour: null,
  dndEndHour: null,
};

export async function getNotificationPreferencesByUser(userId: string): Promise<NotificationPreferenceSnapshot> {
  const preference = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (!preference) {
    return { ...DEFAULT_PREFERENCES, userId };
  }
  return {
    userId,
    emailEnabled: preference.emailEnabled,
    pushEnabled: preference.pushEnabled,
    inAppEnabled: preference.inAppEnabled,
    emailDigestHour: preference.emailDigestHour,
    emailDigestTimezone: preference.emailDigestTimezone,
    dndEnabled: preference.dndEnabled,
    dndStartHour: preference.dndStartHour,
    dndEndHour: preference.dndEndHour,
  };
}

export async function updateNotificationPreferences(
  userId: string,
  data: Partial<NotificationPreferenceSnapshot>,
): Promise<NotificationPreferenceSnapshot> {
  const upserted = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      emailEnabled: data.emailEnabled ?? DEFAULT_PREFERENCES.emailEnabled,
      pushEnabled: data.pushEnabled ?? DEFAULT_PREFERENCES.pushEnabled,
      inAppEnabled: data.inAppEnabled ?? DEFAULT_PREFERENCES.inAppEnabled,
      emailDigestHour: data.emailDigestHour ?? DEFAULT_PREFERENCES.emailDigestHour,
      emailDigestTimezone: data.emailDigestTimezone ?? null,
      dndEnabled: data.dndEnabled ?? DEFAULT_PREFERENCES.dndEnabled,
      dndStartHour: data.dndStartHour ?? null,
      dndEndHour: data.dndEndHour ?? null,
    },
    update: {
      emailEnabled: data.emailEnabled ?? undefined,
      pushEnabled: data.pushEnabled ?? undefined,
      inAppEnabled: data.inAppEnabled ?? undefined,
      emailDigestHour: data.emailDigestHour ?? undefined,
      emailDigestTimezone: data.emailDigestTimezone ?? undefined,
      dndEnabled: data.dndEnabled ?? undefined,
      dndStartHour: data.dndStartHour ?? undefined,
      dndEndHour: data.dndEndHour ?? undefined,
    },
  });

  if (data.emailDigestHour != null) {
    const hour = Math.min(Math.max(data.emailDigestHour, 0), 23);
    await prisma.notificationRule.updateMany({
      where: { userId, name: "time_morning_digest" },
      data: {
        schedule: `FREQ=DAILY;BYHOUR=${hour};BYMINUTE=10`,
      },
    });
  }

  return {
    userId,
    emailEnabled: upserted.emailEnabled,
    pushEnabled: upserted.pushEnabled,
    inAppEnabled: upserted.inAppEnabled,
    emailDigestHour: upserted.emailDigestHour,
    emailDigestTimezone: upserted.emailDigestTimezone,
    dndEnabled: upserted.dndEnabled,
    dndStartHour: upserted.dndStartHour,
    dndEndHour: upserted.dndEndHour,
  };
}

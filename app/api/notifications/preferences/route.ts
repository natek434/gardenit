import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { updateNotificationPreferences } from "@/src/server/notification-preference-service";

const schema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  emailDigestHour: z.number().int().min(0).max(23).optional(),
  emailDigestTimezone: z.string().min(2).max(120).optional().nullable(),
  dndEnabled: z.boolean().optional(),
  dndStartHour: z.number().int().min(0).max(23).nullable().optional(),
  dndEndHour: z.number().int().min(0).max(23).nullable().optional(),
});

const isValidTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch (error) {
    console.warn("[Gardenit] Invalid timezone received", value, error);
    return false;
  }
};

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.dndEnabled) {
    if (payload.dndStartHour == null || payload.dndEndHour == null) {
      return NextResponse.json(
        { error: "Start and end hours are required when do not disturb is enabled" },
        { status: 400 },
      );
    }
    if (payload.dndStartHour === payload.dndEndHour) {
      return NextResponse.json(
        { error: "Start and end hours must differ for do not disturb" },
        { status: 400 },
      );
    }
  }

  if (payload.emailDigestTimezone) {
    if (!isValidTimezone(payload.emailDigestTimezone)) {
      return NextResponse.json({ error: "Timezone is invalid" }, { status: 400 });
    }
  }

  const updated = await updateNotificationPreferences(session.user.id, {
    emailEnabled: payload.emailEnabled,
    pushEnabled: payload.pushEnabled,
    inAppEnabled: payload.inAppEnabled,
    emailDigestHour: payload.emailDigestHour,
    emailDigestTimezone: payload.emailDigestTimezone ?? null,
    dndEnabled: payload.dndEnabled,
    dndStartHour: payload.dndStartHour ?? null,
    dndEndHour: payload.dndEndHour ?? null,
  });

  return NextResponse.json({ preferences: updated });
}

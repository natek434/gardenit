import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { changeUserPassword, updateUserProfile } from "@/src/server/user-service";

const schema = z.object({
  name: z.string().min(2).max(80).optional().nullable(),
  climateZoneId: z.string().min(1).optional().nullable(),
  locationName: z.string().min(2).max(140).optional().nullable(),
  locationLat: z.number().finite().optional().nullable(),
  locationLon: z.number().finite().optional().nullable(),
  password: z
    .object({
      current: z.string().min(8),
      next: z.string().min(8),
    })
    .optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.password) {
    try {
      const result = await changeUserPassword(session.user.id, payload.password.current, payload.password.next);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
    } catch (error) {
      console.error("Password update failed", error);
      return NextResponse.json({ error: "Unable to update password" }, { status: 400 });
    }
  }

  const updated = await updateUserProfile(session.user.id, {
    name: payload.name ?? null,
    climateZoneId: payload.climateZoneId ?? null,
    locationName: payload.locationName ?? null,
    locationLat: payload.locationLat ?? null,
    locationLon: payload.locationLon ?? null,
  });

  return NextResponse.json({ user: updated });
}

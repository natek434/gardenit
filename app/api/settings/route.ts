import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { updateUserProfile } from "@/src/server/user-service";

const schema = z.object({
  name: z.string().min(2).max(80).optional().nullable(),
  climateZoneId: z.string().min(1).optional().nullable(),
  locationLat: z.number().finite().optional().nullable(),
  locationLon: z.number().finite().optional().nullable(),
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
  const updated = await updateUserProfile(session.user.id, {
    name: payload.name ?? null,
    climateZoneId: payload.climateZoneId ?? null,
    locationLat: payload.locationLat ?? null,
    locationLon: payload.locationLon ?? null,
  });

  return NextResponse.json({ user: updated });
}

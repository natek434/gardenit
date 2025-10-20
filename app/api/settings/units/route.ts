import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import {
  getMeasurementPreferencesByUser,
  updateMeasurementPreferences,
} from "@/src/server/measurement-preference-service";

const payloadSchema = z.object({
  temperatureUnit: z.enum(["CELSIUS", "FAHRENHEIT"]).optional(),
  windSpeedUnit: z.enum(["KPH", "MPH", "MPS", "KNOTS"]).optional(),
  pressureUnit: z.enum(["HPA", "INHG", "KPA", "MMHG"]).optional(),
  precipitationUnit: z.enum(["MILLIMETERS", "INCHES"]).optional(),
  lengthUnit: z.enum(["CENTIMETERS", "METERS", "INCHES", "FEET"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getMeasurementPreferencesByUser(session.user.id);
  return NextResponse.json({ preferences });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const updated = await updateMeasurementPreferences(session.user.id, parsed.data);
  return NextResponse.json({ preferences: updated });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { createReminder, getRemindersByUser } from "@/src/server/reminder-service";

const postSchema = z.object({
  title: z.string().min(2),
  dueAt: z
    .string()
    .transform((value) => new Date(value))
    .refine((date) => !Number.isNaN(date.getTime()), "Invalid date"),
  cadence: z.string().optional(),
  type: z.string(),
});

const querySchema = z.object({
  searchParams: z.object({
    user: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  const result = postSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }
  const reminder = await createReminder({
    userId: session.user.id,
    title: result.data.title,
    dueAt: result.data.dueAt,
    cadence: result.data.cadence,
    type: result.data.type,
  });
  return NextResponse.json({ reminder });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ searchParams: Object.fromEntries(url.searchParams.entries()) });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }
  const session = await auth();
  const userId = parsed.data.searchParams.user ?? session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reminders = await getRemindersByUser(userId);
  return NextResponse.json({ reminders });
}

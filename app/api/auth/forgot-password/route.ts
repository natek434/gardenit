import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "@/src/lib/prisma";

const payloadSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });

  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60);

  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token,
      expires,
    },
  });

  return NextResponse.json({ ok: true, token });
}

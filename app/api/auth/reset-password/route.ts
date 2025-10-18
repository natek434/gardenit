import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token: parsed.data.token } });
  if (!record || record.expires.getTime() < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { hashedPassword } });
  await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(80).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const result = signUpSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: result.error.format() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: result.data.email } });
  if (existing) {
    return NextResponse.json({ error: "An account already exists for that email" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(result.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: result.data.email,
      name: result.data.name,
      hashedPassword,
      role: Role.USER,
      collections: {
        create: {
          name: "My plants",
        },
      },
    },
  });

  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
}

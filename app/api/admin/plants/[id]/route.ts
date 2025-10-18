import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/src/lib/auth/options";
import { updatePlantForAdmin } from "@/src/server/plant-service";

const updateSchema = z
  .object({
    commonName: z.string().min(1).optional(),
    scientificName: z.string().min(1).nullable().optional(),
    category: z.string().min(1).optional(),
    sunRequirement: z.string().min(1).optional(),
    cycle: z.string().min(1).nullable().optional(),
    daysToMaturity: z.number().int().positive().nullable().optional(),
    sowDepthMm: z.number().int().nonnegative().nullable().optional(),
    spacingInRowCm: z.number().int().nonnegative().nullable().optional(),
    spacingBetweenRowsCm: z.number().int().nonnegative().nullable().optional(),
    careNotes: z.string().nullable().optional(),
    imageLocalPath: z.string().min(1).nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  try {
    const plant = await updatePlantForAdmin(params.id, parsed.data);
    revalidatePath("/admin/plants");
    return NextResponse.json({ plant });
  } catch (error) {
    return NextResponse.json({ error: "Unable to update plant" }, { status: 500 });
  }
}

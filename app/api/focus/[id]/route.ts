import { NextResponse } from "next/server";
import { auth } from "@/src/lib/auth/options";
import { deleteFocusItem } from "@/src/server/focus-service";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const removed = await deleteFocusItem(params.id, session.user.id);
  if (!removed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ focus: removed });
}

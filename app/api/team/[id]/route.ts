import { NextResponse } from "next/server";
import { fail, requireSession } from "@/lib/api-helpers";
import { listTeam, removeStaff } from "@/lib/db/team";

/** Owner: remove a staff login (D2). The owner's own login cannot be removed. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireSession({ ownerOnly: true });
  if (denied) return denied;
  if (!(await removeStaff(session.shopId, (await params).id)))
    return fail(404, "That staff login was not found.");
  return NextResponse.json(await listTeam(session.shopId));
}

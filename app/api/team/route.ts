import { NextResponse } from "next/server";
import { explain, fail, invalid, requireSession } from "@/lib/api-helpers";
import { listTeam, saveMember } from "@/lib/db/team";
import { staffSchema } from "@/lib/validation";

/** Owner and staff: who can log in to the shop (also the "collected by" choices). */
export async function GET() {
  const { session, denied } = await requireSession();
  if (denied) return denied;
  return NextResponse.json(await listTeam(session.shopId));
}

/** Owner: add a staff login (D2). */
export async function POST(req: Request) {
  const { session, denied } = await requireSession({ ownerOnly: true });
  if (denied) return denied;

  const parsed = staffSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  const email = parsed.data.email.trim().toLowerCase();
  const team = await listTeam(session.shopId);
  if (team.some((m) => m.email === email))
    return fail(400, "Someone at this shop already logs in with that email.");
  try {
    await saveMember({ ...parsed.data, shopId: session.shopId, role: "staff" });
    return NextResponse.json(await listTeam(session.shopId), { status: 201 });
  } catch (e) {
    return explain(e);
  }
}

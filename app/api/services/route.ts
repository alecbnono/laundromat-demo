import { NextResponse } from "next/server";
import { explain, fail, invalid, requireSession } from "@/lib/api-helpers";
import { listServices, saveService } from "@/lib/db/shops";
import { serviceSchema } from "@/lib/validation";

/** Owner and staff: the shop's services and prices per kilo, hidden ones included. */
export async function GET() {
  const { session, denied } = await requireSession();
  if (denied) return denied;
  return NextResponse.json(await listServices(session.shopId));
}

/** Owner: add a service, or change one's name, price or whether it is offered (C1). */
export async function POST(req: Request) {
  const { session, denied } = await requireSession({ ownerOnly: true });
  if (denied) return denied;

  const parsed = serviceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalid(parsed.error);
  try {
    if (!(await saveService(session.shopId, parsed.data))) return fail(404, "Service not found.");
    return NextResponse.json(await listServices(session.shopId));
  } catch (e) {
    return explain(e);
  }
}

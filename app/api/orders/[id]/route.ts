import { NextResponse } from "next/server";
import { explain, fail, idParam, requireSession } from "@/lib/api-helpers";
import { updateOrder } from "@/lib/db/orders";
import { orderPatchSchema } from "@/lib/validation";

/** Owner and staff: change status, kilos/total, details, or the "customer told" tick. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireSession();
  if (denied) return denied;

  const id = idParam((await params).id);
  const parsed = orderPatchSchema.safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return fail(400, "That change could not be saved.");

  try {
    const order = await updateOrder(session.shopId, id, parsed.data, session.me.name);
    return order ? NextResponse.json(order) : fail(404, "Order not found.");
  } catch (e) {
    return explain(e);
  }
}

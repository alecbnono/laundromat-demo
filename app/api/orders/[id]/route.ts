import { NextResponse } from "next/server";
import { updateOrder } from "@/lib/db/orders";
import { getOwnerSession } from "@/lib/session";
import { orderPatchSchema } from "@/lib/validation";

/** Owner: change status, kilos/amount, payment, or the "customer told" tick. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getOwnerSession()))
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const id = Number((await params).id);
  const parsed = orderPatchSchema.safeParse(await req.json().catch(() => null));
  if (!Number.isInteger(id) || id <= 0 || !parsed.success)
    return NextResponse.json({ error: "That change could not be saved." }, { status: 400 });

  const order = await updateOrder(id, parsed.data);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json(order);
}

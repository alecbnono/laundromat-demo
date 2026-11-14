import { NextResponse } from "next/server";
import { explain, fail, idParam, requireSession } from "@/lib/api-helpers";
import { addPayment } from "@/lib/db/orders";
import { paymentSchema } from "@/lib/validation";

/** Owner and staff: record a payment on an order (C2). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireSession();
  if (denied) return denied;

  const id = idParam((await params).id);
  const parsed = paymentSchema.safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return fail(400, "Enter the amount paid.");

  try {
    const order = await addPayment(session.shopId, id, {
      ...parsed.data,
      // Whoever records it collected it, unless they say someone else did.
      collectedById: parsed.data.collectedById ?? session.me.id,
    });
    return order ? NextResponse.json(order, { status: 201 }) : fail(404, "Order not found.");
  } catch (e) {
    return explain(e);
  }
}

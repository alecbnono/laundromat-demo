import { NextResponse } from "next/server";
import { explain, fail, idParam, requireSession } from "@/lib/api-helpers";
import { removePayment } from "@/lib/db/orders";

/** Remove a payment recorded by mistake. Staff: only their own. Owner: any. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> },
) {
  const { session, denied } = await requireSession();
  if (denied) return denied;

  const { id, paymentId } = await params;
  const orderId = idParam(id);
  const payment = idParam(paymentId);
  if (!orderId || !payment) return fail(400, "That payment could not be removed.");

  try {
    const order = await removePayment(
      session.shopId,
      orderId,
      payment,
      session.me.role === "owner" ? undefined : session.me.id,
    );
    return order ? NextResponse.json(order) : fail(404, "Payment not found.");
  } catch (e) {
    return explain(e);
  }
}

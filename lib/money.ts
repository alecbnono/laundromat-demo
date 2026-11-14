// Totals, payments and balances (requirements C1 to C3). Pure functions, used by the
// screens, the server and the demo alike.
import type { Order } from "./types.ts";

/** Order total from the weight: kilos x price per kilo, to the nearest centavo. */
export function totalFor(weightKg: number, rateCentavos: number): number {
  return Math.round(weightKg * rateCentavos);
}

export function paidCentavos(order: Pick<Order, "payments">): number {
  return order.payments.reduce((sum, p) => sum + p.amountCentavos, 0);
}

/** What is still owed. 0 when there is no total yet or the order is cancelled. */
export function balanceCentavos(order: Pick<Order, "payments" | "amountCentavos" | "status">) {
  if (order.amountCentavos == null || order.status === "cancelled") return 0;
  return Math.max(0, order.amountCentavos - paidCentavos(order));
}

export type PayState = "unpaid" | "partial" | "paid";

export function payState(order: Pick<Order, "payments" | "amountCentavos">): PayState {
  const paid = paidCentavos(order);
  if (paid === 0) return "unpaid";
  if (order.amountCentavos == null || paid < order.amountCentavos) return "partial";
  return "paid";
}

export const PAY_STATE_LABEL: Record<PayState, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
};

// The daily summary (C4), the unpaid list (C5) and a person's collections (C6).
// Worked out from the order list, so the real app and the demo share it.
import { manilaDay } from "./format.ts";
import { balanceCentavos } from "./money.ts";
import { PAYMENT_METHODS, type Order, type Payment, type PaymentMethod } from "./types.ts";

export type ByMethod = Record<PaymentMethod, number>;
const noMoney = (): ByMethod => ({ cash: 0, gcash: 0, bank: 0 });

export interface CollectedPayment extends Payment {
  orderId: number;
  orderNumber: number;
  customerName: string;
}

export interface DailySummary {
  date: string;
  /** Orders that came in that day (cancelled ones not counted). */
  received: number;
  /** Orders marked Delivered that day. */
  delivered: number;
  /** Totals of the orders that came in that day. */
  billedCentavos: number;
  /** Money taken that day, whichever day the order came in. */
  collectedCentavos: number;
  collectedByMethod: ByMethod;
  collectedByPerson: { id: string | null; name: string; totalCentavos: number; byMethod: ByMethod }[];
  payments: CollectedPayment[];
}

/**
 * The summary for one Manila calendar day. With `collectorId`, the collected figures and
 * payments are only that person's (the staff view).
 */
export function dailySummary(orders: Order[], date: string, collectorId?: string): DailySummary {
  const cameIn = orders.filter((o) => manilaDay(o.createdAt) === date && o.status !== "cancelled");
  const delivered = orders.filter(
    (o) =>
      o.status === "completed" &&
      // The last time it was marked Delivered is the one that counts.
      manilaDay(o.history.findLast((e) => e.status === "completed")?.at ?? o.updatedAt) === date,
  );

  const payments: CollectedPayment[] = orders
    .flatMap((o) =>
      o.payments.map((p) => ({
        ...p,
        orderId: o.id,
        orderNumber: o.number,
        customerName: o.customer.name,
      })),
    )
    .filter((p) => manilaDay(p.at) === date)
    .filter((p) => collectorId === undefined || p.collectedById === collectorId)
    .sort((a, b) => a.at.localeCompare(b.at));

  const collectedByMethod = noMoney();
  const people = new Map<string, DailySummary["collectedByPerson"][number]>();
  for (const p of payments) {
    collectedByMethod[p.method] += p.amountCentavos;
    const key = p.collectedById ?? `name:${p.collectedByName}`;
    const person =
      people.get(key) ??
      { id: p.collectedById, name: p.collectedByName, totalCentavos: 0, byMethod: noMoney() };
    person.totalCentavos += p.amountCentavos;
    person.byMethod[p.method] += p.amountCentavos;
    people.set(key, person);
  }

  return {
    date,
    received: cameIn.length,
    delivered: delivered.length,
    billedCentavos: cameIn.reduce((sum, o) => sum + (o.amountCentavos ?? 0), 0),
    collectedCentavos: PAYMENT_METHODS.reduce((sum, m) => sum + collectedByMethod[m], 0),
    collectedByMethod,
    collectedByPerson: [...people.values()].sort((a, b) => b.totalCentavos - a.totalCentavos),
    payments,
  };
}

/** Everything still owed to the shop right now, across all orders that are not cancelled. */
export function unpaidBalance(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + balanceCentavos(o), 0);
}

/** C5: orders delivered but not fully paid, oldest first. */
export function unpaidDelivered(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.status === "completed" && balanceCentavos(o) > 0)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** B1: newest first. */
export function newestFirst(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
}

/** B4: search by customer name or phone number (any format), or by order number. */
export function matchesSearch(order: Order, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (order.customer.name.toLowerCase().includes(q)) return true;
  if (q.replace(/^#/, "") === String(order.number)) return true;
  // Compare digits only, without the leading 0 or 63, so "0917 123" finds "+63917123...".
  const digits = q.replace(/\D/g, "").replace(/^(63|0)/, "");
  return digits.length >= 3 && order.customer.phone.replace(/\D/g, "").includes(digits);
}

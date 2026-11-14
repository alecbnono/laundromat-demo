// Order queries. Everything that reads or writes orders goes through here, and every
// function is limited to one shop (D1): a shop can never see or change another's orders.
import { and, asc, count, eq, inArray, max, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, ready } from "./index.ts";
import { customers, orderEvents, orders, payments, services, user } from "./schema.ts";
import { balanceCentavos, totalFor } from "../money.ts";
import type {
  NewOrderInput,
  NewPayment,
  Order,
  OrderPatch,
  Payment,
  Source,
  Status,
  StatusEvent,
} from "../types.ts";

const now = () => new Date().toISOString();

const baseQuery = () =>
  db
    .select({ order: orders, customer: customers, service: services })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(services, eq(services.id, orders.serviceId));

type Row = Awaited<ReturnType<typeof baseQuery>>[number];

/** Adds each order's payments and status history. */
async function complete(rows: Row[]): Promise<Order[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.order.id);
  const [paid, events] = await Promise.all([
    db.select().from(payments).where(inArray(payments.orderId, ids)).orderBy(asc(payments.id)),
    db
      .select()
      .from(orderEvents)
      .where(inArray(orderEvents.orderId, ids))
      .orderBy(asc(orderEvents.id)),
  ]);
  const paymentsOf = new Map<number, Payment[]>();
  for (const { orderId, ...p } of paid)
    paymentsOf.set(orderId, [...(paymentsOf.get(orderId) ?? []), p]);
  const historyOf = new Map<number, StatusEvent[]>();
  for (const { orderId, status, at, byName } of events)
    historyOf.set(orderId, [...(historyOf.get(orderId) ?? []), { status, at, byName }]);

  return rows.map(({ order, customer, service }) => {
    const { customerId: _customerId, shopId: _shopId, ...rest } = order;
    return {
      ...rest,
      service: service.name,
      rateCentavos: service.pricePerKgCentavos,
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
      payments: paymentsOf.get(order.id) ?? [],
      history: historyOf.get(order.id) ?? [],
    };
  });
}

/** Every order of one shop, newest first (B1). */
export async function listOrders(shopId: number): Promise<Order[]> {
  await ready();
  const rows = await baseQuery()
    .where(eq(orders.shopId, shopId))
    .orderBy(sql`${orders.createdAt} desc`, sql`${orders.id} desc`);
  return complete(rows);
}

export async function getOrder(shopId: number, id: number): Promise<Order | null> {
  await ready();
  const rows = await baseQuery().where(and(eq(orders.id, id), eq(orders.shopId, shopId)));
  return (await complete(rows))[0] ?? null;
}

/** For the customer's confirmation page. The token is the key, so no shop is needed. */
export async function getOrderByToken(
  token: string,
): Promise<{ order: Order; shopId: number } | null> {
  await ready();
  const rows = await baseQuery().where(eq(orders.token, token));
  const [order] = await complete(rows);
  return order ? { order, shopId: rows[0].order.shopId } : null;
}

export async function countOrders(shopId: number): Promise<number> {
  await ready();
  const [row] = await db.select({ n: count() }).from(orders).where(eq(orders.shopId, shopId));
  return row.n;
}

export class OrderError extends Error {}

/** This shop's service, or an error: an order can never use another shop's service. */
async function shopService(shopId: number, serviceId: number) {
  const [service] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.shopId, shopId)));
  if (!service) throw new OrderError("That service is not offered by this shop.");
  return service;
}

/**
 * Creates an order, reusing the customer record if this shop knows the phone number.
 * `timestamps` and `events` are for loading sample data with past dates.
 */
export async function createOrder(
  shopId: number,
  input: NewOrderInput,
  by: { source: Source; byName: string; status?: Status; createdAt?: string },
): Promise<{ id: number; token: string }> {
  await ready();
  const ts = by.createdAt ?? now();
  const token = randomBytes(9).toString("base64url");
  const { name, phone, weightKg = null, ...details } = input;
  const service = await shopService(shopId, input.serviceId);
  // C1: the total is kilos x rate unless the shop typed another amount.
  const amountCentavos =
    input.amountCentavos ??
    (weightKg != null ? totalFor(weightKg, service.pricePerKgCentavos) : null);
  const status = by.status ?? "new";

  return db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customers)
      .values({
        shopId,
        name,
        phone,
        address: details.address,
        landmark: details.landmark,
        createdAt: ts,
      })
      .onConflictDoUpdate({
        target: [customers.shopId, customers.phone],
        // Keep the old address when a walk-in order has none.
        set: details.address
          ? { name, address: details.address, landmark: details.landmark }
          : { name },
      })
      .returning({ id: customers.id });
    const [last] = await tx
      .select({ n: max(orders.number) })
      .from(orders)
      .where(eq(orders.shopId, shopId));
    const [order] = await tx
      .insert(orders)
      .values({
        ...details,
        weightKg,
        amountCentavos,
        shopId,
        number: (last.n ?? 0) + 1,
        token,
        customerId: customer.id,
        status,
        source: by.source,
        createdAt: ts,
        updatedAt: ts,
      })
      .returning({ id: orders.id });
    await tx.insert(orderEvents).values({ orderId: order.id, status, byName: by.byName, at: ts });
    return { id: order.id, token };
  });
}

/**
 * Applies the shop's changes. Returns the updated order, or null if this shop has no such
 * order. A status change is added to the history. `at` is for sample data with past dates.
 */
export async function updateOrder(
  shopId: number,
  id: number,
  patch: OrderPatch,
  byName: string,
  at?: string,
): Promise<Order | null> {
  await ready();
  const old = await getOrder(shopId, id);
  if (!old) return null;
  const ts = at ?? now();
  const { notified, ...fields } = patch;
  if (fields.serviceId !== undefined) await shopService(shopId, fields.serviceId);

  const set: Partial<typeof orders.$inferInsert> = { ...fields, updatedAt: ts };
  if (notified !== undefined) set.notifiedAt = notified ? ts : null;

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set(set)
      .where(and(eq(orders.id, id), eq(orders.shopId, shopId)));
    if (patch.status !== undefined && patch.status !== old.status)
      await tx.insert(orderEvents).values({ orderId: id, status: patch.status, byName, at: ts });
  });
  return getOrder(shopId, id);
}

/**
 * Records a payment (C2). The collector must be a login of the same shop, and the amount
 * cannot be more than what is still owed.
 */
export async function addPayment(
  shopId: number,
  orderId: number,
  input: NewPayment & { collectedById: string },
  at?: string,
): Promise<Order | null> {
  await ready();
  const order = await getOrder(shopId, orderId);
  if (!order) return null;
  if (order.amountCentavos == null)
    throw new OrderError("Set the order total before recording a payment.");
  if (input.amountCentavos > balanceCentavos(order))
    throw new OrderError("That is more than what is still owed on this order.");
  const [collector] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(eq(user.id, input.collectedById), eq(user.shopId, shopId)));
  if (!collector) throw new OrderError("Choose who collected the payment.");

  const ts = at ?? now();
  await db.insert(payments).values({
    orderId,
    amountCentavos: input.amountCentavos,
    method: input.method,
    collectedById: collector.id,
    collectedByName: collector.name,
    at: ts,
  });
  if (!at) await db.update(orders).set({ updatedAt: ts }).where(eq(orders.id, orderId));
  return getOrder(shopId, orderId);
}

/**
 * Removes a payment recorded by mistake. With `onlyBy`, only if that person collected it
 * (staff may undo their own entries; the owner may undo any).
 */
export async function removePayment(
  shopId: number,
  orderId: number,
  paymentId: number,
  onlyBy?: string,
): Promise<Order | null> {
  await ready();
  const order = await getOrder(shopId, orderId);
  const payment = order?.payments.find((p) => p.id === paymentId);
  if (!order || !payment) return null;
  if (onlyBy !== undefined && payment.collectedById !== onlyBy)
    throw new OrderError("Only the owner can remove a payment someone else collected.");
  await db.delete(payments).where(and(eq(payments.id, paymentId), eq(payments.orderId, orderId)));
  await db.update(orders).set({ updatedAt: now() }).where(eq(orders.id, orderId));
  return getOrder(shopId, orderId);
}

/** Deletes every order and customer of one shop. Used by the seed script's --reset only. */
export async function deleteAllOrders(shopId: number): Promise<void> {
  await ready();
  await db.delete(orders).where(eq(orders.shopId, shopId)); // payments and history follow
  await db.delete(customers).where(eq(customers.shopId, shopId));
}

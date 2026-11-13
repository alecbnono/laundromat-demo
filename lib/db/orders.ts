// Order queries. Everything that reads or writes orders goes through here.
import { asc, count, eq, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, ready } from "./index.ts";
import { customers, orders } from "./schema.ts";
import type { NewOrderInput, Order, OrderPatch } from "../types.ts";

const now = () => new Date().toISOString();

function toOrder(row: {
  order: typeof orders.$inferSelect;
  customer: typeof customers.$inferSelect;
}): Order {
  const { customerId: _customerId, ...order } = row.order;
  const { id, name, phone } = row.customer;
  return { ...order, customer: { id, name, phone } };
}

const withCustomer = () =>
  db
    .select({ order: orders, customer: customers })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId));

export async function listOrders(): Promise<Order[]> {
  await ready();
  const rows = await withCustomer().orderBy(asc(orders.pickupDate), asc(orders.id));
  return rows.map(toOrder);
}

export async function getOrder(id: number): Promise<Order | null> {
  await ready();
  const [row] = await withCustomer().where(eq(orders.id, id));
  return row ? toOrder(row) : null;
}

export async function getOrderByToken(token: string): Promise<Order | null> {
  await ready();
  const [row] = await withCustomer().where(eq(orders.token, token));
  return row ? toOrder(row) : null;
}

export async function countOrders(): Promise<number> {
  await ready();
  const [row] = await db.select({ n: count() }).from(orders);
  return row.n;
}

/** Creates the order, reusing the customer record if the phone number is known. */
export async function createOrder(
  input: NewOrderInput,
): Promise<{ id: number; token: string }> {
  await ready();
  const ts = now();
  const token = randomBytes(9).toString("base64url");
  const { name, phone, ...details } = input;

  return db.transaction(async (tx) => {
    const [customer] = await tx
      .insert(customers)
      .values({ name, phone, createdAt: ts })
      .onConflictDoUpdate({ target: customers.phone, set: { name } })
      .returning({ id: customers.id });
    const [order] = await tx
      .insert(orders)
      .values({ ...details, token, customerId: customer.id, createdAt: ts, updatedAt: ts })
      .returning({ id: orders.id });
    return { id: order.id, token };
  });
}

/** Applies the owner's changes. Returns the updated order, or null if it doesn't exist. */
export async function updateOrder(id: number, patch: OrderPatch): Promise<Order | null> {
  await ready();
  const ts = now();
  const set: Partial<typeof orders.$inferInsert> = { updatedAt: ts };
  if (patch.status !== undefined) set.status = patch.status;
  if (patch.weightKg !== undefined) set.weightKg = patch.weightKg;
  if (patch.amountCentavos !== undefined) set.amountCentavos = patch.amountCentavos;
  if (patch.paymentMethod !== undefined) {
    set.paymentMethod = patch.paymentMethod;
    set.paid = patch.paymentMethod !== null;
  }
  if (patch.notified !== undefined) set.notifiedAt = patch.notified ? ts : null;

  await db.update(orders).set(set).where(eq(orders.id, id));
  return getOrder(id);
}

/** Deletes every order and customer. Used by the seed script's --reset only. */
export async function deleteAllOrders(): Promise<void> {
  await ready();
  await db.delete(orders);
  await db.delete(customers);
  // Start order numbers from #1 again.
  await db.run(sql`DELETE FROM sqlite_sequence WHERE name IN ('orders', 'customers')`);
}

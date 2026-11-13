// Runs against a throwaway SQLite file, never the real data/laundry.db.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NewOrderInput } from "../types";

let dir: string;
let orders: typeof import("./orders");

const request: NewOrderInput = {
  name: "Liza Mendoza",
  phone: "+639000000101",
  address: "1284 Dapitan St",
  landmark: "",
  service: "Wash, dry and fold",
  pickupDate: "2026-11-13",
  pickupWindow: "8 to 10 AM",
  fulfillment: "delivery",
  notes: "",
};

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "laundry-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  orders = await import("./orders");
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("orders", () => {
  it("creates an order that can be found by its private link", async () => {
    const { id, token } = await orders.createOrder(request);
    const order = await orders.getOrderByToken(token);
    expect(order).toMatchObject({
      id,
      status: "new",
      paid: false,
      weightKg: null,
      customer: { name: "Liza Mendoza", phone: "+639000000101" },
    });
    expect(await orders.getOrderByToken("nope")).toBeNull();
  });

  it("reuses the customer when the phone number is known, updating the name", async () => {
    const a = await orders.createOrder(request);
    const b = await orders.createOrder({ ...request, name: "Liza M." });
    const [first, second] = await Promise.all([orders.getOrder(a.id), orders.getOrder(b.id)]);
    expect(second!.customer.id).toBe(first!.customer.id);
    expect(first!.customer.name).toBe("Liza M.");
  });

  it("applies owner changes", async () => {
    const { id } = await orders.createOrder({ ...request, phone: "+639000000102" });

    let order = await orders.updateOrder(id, { weightKg: 7.5, amountCentavos: 18000 });
    expect(order).toMatchObject({ weightKg: 7.5, amountCentavos: 18000, status: "new" });

    order = await orders.updateOrder(id, { paymentMethod: "gcash" });
    expect(order).toMatchObject({ paid: true, paymentMethod: "gcash", amountCentavos: 18000 });

    order = await orders.updateOrder(id, { paymentMethod: null });
    expect(order).toMatchObject({ paid: false, paymentMethod: null });

    order = await orders.updateOrder(id, { status: "ready", notified: true });
    expect(order!.status).toBe("ready");
    expect(order!.notifiedAt).not.toBeNull();

    order = await orders.updateOrder(id, { notified: false });
    expect(order!.notifiedAt).toBeNull();
  });

  it("returns null for an order that does not exist", async () => {
    expect(await orders.updateOrder(9999, { status: "ready" })).toBeNull();
  });

  it("lists orders by pickup date", async () => {
    await orders.createOrder({ ...request, phone: "+639000000103", pickupDate: "2026-11-01" });
    const list = await orders.listOrders();
    expect(list[0].pickupDate).toBe("2026-11-01");
    expect(await orders.countOrders()).toBe(list.length);
  });
});

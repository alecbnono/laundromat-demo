// Runs against a throwaway SQLite file, never the real data/laundry.db.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NewOrderInput, Shop } from "../types";

let dir: string;
let orders: typeof import("./orders");
let shops: typeof import("./shops");
let team: typeof import("./team");

let shopA: Shop;
let shopB: Shop;
let foldA: number; // shop A's "Wash and fold" at ₱35/kg
let foldB: number;
let ownerA: string;
let staffA: string;
let ownerB: string;

const newShop = (slug: string): Omit<Shop, "id"> => ({
  slug,
  name: slug,
  tagline: "",
  logo: "/logo.svg",
  phone: "+639000000000",
  hours: "",
  pickupWindows: ["8 to 10 AM"],
  maxDaysAhead: 14,
});

const request = (serviceId: number, extra: Partial<NewOrderInput> = {}): NewOrderInput => ({
  name: "Liza Mendoza",
  phone: "+639000000101",
  address: "1284 Dapitan St",
  landmark: "",
  serviceId,
  intake: "pickup",
  pickupDate: "2026-11-13",
  pickupWindow: "8 to 10 AM",
  fulfillment: "delivery",
  notes: "",
  ...extra,
});
const byCustomer = { source: "form", byName: "Customer" } as const;

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "laundry-test-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  process.env.BETTER_AUTH_SECRET = "test-only-secret-test-only-secret";
  orders = await import("./orders");
  shops = await import("./shops");
  team = await import("./team");

  shopA = await shops.createShop(newShop("shop-a"));
  shopB = await shops.createShop(newShop("shop-b"));
  const fold = { name: "Wash and fold", pricePerKgCentavos: 3500, active: true };
  await shops.saveService(shopA.id, fold);
  await shops.saveService(shopB.id, { ...fold, pricePerKgCentavos: 4000 });
  foldA = (await shops.listServices(shopA.id))[0].id;
  foldB = (await shops.listServices(shopB.id))[0].id;

  const login = { password: "password-123" };
  await team.saveMember({ ...login, shopId: shopA.id, role: "owner", name: "Rosa", email: "rosa@a.test" });
  await team.saveMember({ ...login, shopId: shopA.id, role: "staff", name: "Benjo", email: "benjo@a.test" });
  await team.saveMember({ ...login, shopId: shopB.id, role: "owner", name: "Olive", email: "olive@b.test" });
  [ownerA, staffA] = (await team.listTeam(shopA.id)).map((m) => m.id);
  [ownerB] = (await team.listTeam(shopB.id)).map((m) => m.id);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("orders", () => {
  it("creates a Requested order that can be found by its private link (A4)", async () => {
    const { id, token } = await orders.createOrder(shopA.id, request(foldA), byCustomer);
    const found = await orders.getOrderByToken(token);
    expect(found?.shopId).toBe(shopA.id);
    expect(found?.order).toMatchObject({
      id,
      status: "new",
      source: "form",
      service: "Wash and fold",
      rateCentavos: 3500,
      weightKg: null,
      amountCentavos: null,
      payments: [],
      customer: { name: "Liza Mendoza", phone: "+639000000101" },
    });
    expect(found?.order.history.map((e) => [e.status, e.byName])).toEqual([["new", "Customer"]]);
    expect(await orders.getOrderByToken("nope")).toBeNull();
  });

  it("reuses the customer when the phone number is known, updating the name", async () => {
    const a = await orders.createOrder(shopA.id, request(foldA), byCustomer);
    const b = await orders.createOrder(shopA.id, request(foldA, { name: "Liza M." }), byCustomer);
    const [first, second] = await Promise.all([
      orders.getOrder(shopA.id, a.id),
      orders.getOrder(shopA.id, b.id),
    ]);
    expect(second!.customer.id).toBe(first!.customer.id);
    expect(first!.customer.name).toBe("Liza M.");
  });

  it("works out the total from the kilos, unless one is typed (C1)", async () => {
    const byRate = await orders.createOrder(
      shopA.id,
      request(foldA, { phone: "+639000000102", weightKg: 7.5 }),
      { source: "manual", byName: "Rosa", status: "picked_up" },
    );
    expect(await orders.getOrder(shopA.id, byRate.id)).toMatchObject({
      status: "picked_up",
      source: "manual",
      weightKg: 7.5,
      amountCentavos: 26250,
    });

    const typed = await orders.updateOrder(shopA.id, byRate.id, { amountCentavos: 30000 }, "Rosa");
    expect(typed).toMatchObject({ weightKg: 7.5, amountCentavos: 30000 });
  });

  it("applies changes and keeps a status history (B3, B6)", async () => {
    const { id } = await orders.createOrder(shopA.id, request(foldA, { phone: "+639000000103" }), byCustomer);

    let order = await orders.updateOrder(shopA.id, id, { status: "picked_up" }, "Benjo");
    order = await orders.updateOrder(shopA.id, id, { notes: "Hang the polos", address: "2 New St" }, "Rosa");
    expect(order).toMatchObject({ status: "picked_up", notes: "Hang the polos", address: "2 New St" });

    order = await orders.updateOrder(shopA.id, id, { status: "ready", notified: true }, "Rosa");
    expect(order!.notifiedAt).not.toBeNull();
    order = await orders.updateOrder(shopA.id, id, { notified: false }, "Rosa");
    expect(order!.notifiedAt).toBeNull();

    // Only status changes are history; saving the same status again adds nothing.
    order = await orders.updateOrder(shopA.id, id, { status: "ready" }, "Rosa");
    expect(order!.history.map((e) => [e.status, e.byName])).toEqual([
      ["new", "Customer"],
      ["picked_up", "Benjo"],
      ["ready", "Rosa"],
    ]);
  });

  it("lists a shop's orders newest first (B1)", async () => {
    const { id } = await orders.createOrder(shopA.id, request(foldA, { phone: "+639000000104" }), byCustomer);
    const list = await orders.listOrders(shopA.id);
    expect(list[0].id).toBe(id);
    expect(await orders.countOrders(shopA.id)).toBe(list.length);
  });
});

describe("payments (C2, C3)", () => {
  it("records part payments with who collected them, up to the total", async () => {
    const { id } = await orders.createOrder(
      shopA.id,
      request(foldA, { phone: "+639000000105", weightKg: 10 }), // ₱350
      byCustomer,
    );
    let order = await orders.addPayment(shopA.id, id, { amountCentavos: 10000, method: "cash", collectedById: staffA });
    order = await orders.addPayment(shopA.id, id, { amountCentavos: 25000, method: "gcash", collectedById: ownerA });
    expect(order!.payments.map((p) => [p.amountCentavos, p.method, p.collectedByName])).toEqual([
      [10000, "cash", "Benjo"],
      [25000, "gcash", "Rosa"],
    ]);

    await expect(
      orders.addPayment(shopA.id, id, { amountCentavos: 1, method: "cash", collectedById: ownerA }),
    ).rejects.toThrow("more than what is still owed");
  });

  it("needs a total first, and a collector from the same shop", async () => {
    const { id } = await orders.createOrder(shopA.id, request(foldA, { phone: "+639000000106" }), byCustomer);
    const pay = (collectedById: string) =>
      orders.addPayment(shopA.id, id, { amountCentavos: 5000, method: "cash", collectedById });

    await expect(pay(ownerA)).rejects.toThrow("Set the order total");
    await orders.updateOrder(shopA.id, id, { amountCentavos: 5000 }, "Rosa");
    await expect(pay(ownerB)).rejects.toThrow("Choose who collected");
    expect((await pay(staffA))!.payments).toHaveLength(1);
  });

  it("lets staff remove only their own payment, and the owner any", async () => {
    const { id } = await orders.createOrder(
      shopA.id,
      request(foldA, { phone: "+639000000107", amountCentavos: 20000 }),
      byCustomer,
    );
    const order = await orders.addPayment(shopA.id, id, { amountCentavos: 20000, method: "cash", collectedById: ownerA });
    const paymentId = order!.payments[0].id;

    await expect(orders.removePayment(shopA.id, id, paymentId, staffA)).rejects.toThrow("Only the owner");
    expect((await orders.removePayment(shopA.id, id, paymentId))!.payments).toEqual([]);
    expect(await orders.removePayment(shopA.id, id, paymentId)).toBeNull();
  });

  it("keeps the collector's name after their login is removed (D2)", async () => {
    await team.saveMember({ shopId: shopA.id, role: "staff", name: "Temp Rider", email: "temp@a.test", password: "password-123" });
    const temp = (await team.listTeam(shopA.id)).find((m) => m.email === "temp@a.test")!;
    const { id } = await orders.createOrder(
      shopA.id,
      request(foldA, { phone: "+639000000108", amountCentavos: 9000 }),
      byCustomer,
    );
    await orders.addPayment(shopA.id, id, { amountCentavos: 9000, method: "cash", collectedById: temp.id });

    expect(await team.removeStaff(shopA.id, temp.id)).toBe(true);
    expect((await orders.getOrder(shopA.id, id))!.payments[0]).toMatchObject({
      collectedById: null,
      collectedByName: "Temp Rider",
    });
  });
});

describe("one shop cannot see or change another's data (D1)", () => {
  it("numbers each shop's orders from #1", async () => {
    const b1 = await orders.createOrder(shopB.id, request(foldB), byCustomer);
    const b2 = await orders.createOrder(shopB.id, request(foldB, { phone: "+639000000109" }), byCustomer);
    expect((await orders.getOrder(shopB.id, b1.id))!.number).toBe(1);
    expect((await orders.getOrder(shopB.id, b2.id))!.number).toBe(2);
  });

  it("keeps customers separate even with the same phone number", async () => {
    const [a] = (await orders.listOrders(shopA.id)).filter((o) => o.customer.phone === "+639000000101");
    const [b] = (await orders.listOrders(shopB.id)).filter((o) => o.customer.phone === "+639000000101");
    expect(a.customer.id).not.toBe(b.customer.id);
    expect(a.customer.name).toBe("Liza M."); // shop B's "Liza Mendoza" did not rename shop A's
  });

  it("only lists a shop's own orders", async () => {
    const [listA, listB] = await Promise.all([orders.listOrders(shopA.id), orders.listOrders(shopB.id)]);
    expect(listB).toHaveLength(2);
    expect(listA.some((a) => listB.some((b) => b.id === a.id))).toBe(false);
  });

  it("refuses to read, change or take payment for another shop's order", async () => {
    const [theirs] = await orders.listOrders(shopB.id);
    expect(await orders.getOrder(shopA.id, theirs.id)).toBeNull();
    expect(await orders.updateOrder(shopA.id, theirs.id, { status: "cancelled" }, "Rosa")).toBeNull();
    expect(
      await orders.addPayment(shopA.id, theirs.id, { amountCentavos: 100, method: "cash", collectedById: ownerA }),
    ).toBeNull();
    expect((await orders.getOrder(shopB.id, theirs.id))!.status).toBe("new");
  });

  it("refuses another shop's service", async () => {
    await expect(orders.createOrder(shopA.id, request(foldB), byCustomer)).rejects.toThrow("not offered");
    const [mine] = await orders.listOrders(shopA.id);
    await expect(orders.updateOrder(shopA.id, mine.id, { serviceId: foldB }, "Rosa")).rejects.toThrow("not offered");
    expect(await shops.saveService(shopA.id, { id: foldB, name: "Hijack", pricePerKgCentavos: 1, active: true })).toBe(false);
  });

  it("keeps logins to their own shop", async () => {
    expect((await team.listTeam(shopB.id)).map((m) => m.name)).toEqual(["Olive"]);
    expect(await team.removeStaff(shopB.id, staffA)).toBe(false);
    expect(await team.removeStaff(shopA.id, ownerA)).toBe(false); // the owner cannot be removed
    await expect(
      team.saveMember({ shopId: shopB.id, role: "staff", name: "X", email: "benjo@a.test", password: "password-123" }),
    ).rejects.toThrow("another shop");
  });

  it("deletes only one shop's orders on reset", async () => {
    await orders.deleteAllOrders(shopB.id);
    expect(await orders.countOrders(shopB.id)).toBe(0);
    expect(await orders.countOrders(shopA.id)).toBeGreaterThan(0);
  });
});

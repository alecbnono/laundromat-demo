import { beforeEach, describe, expect, it } from "vitest";
import { manilaDate } from "../format";
import { balanceCentavos, payState } from "../money";
import { SAMPLE_ORDERS } from "../sample-data";
import { dailySummary } from "../summary";
import {
  DEMO_SHOP,
  addDemoPayment,
  createDemoManualOrder,
  createDemoOrder,
  demoBackend,
  resetDemo,
  saveDemoService,
  updateDemoOrder,
  useDemoStore,
} from "./store";

const request = {
  name: "Demo Person",
  phone: "0900 000 0555",
  address: "5 Demo St",
  landmark: "",
  serviceId: "1",
  pickupDate: manilaDate(),
  pickupWindow: DEMO_SHOP.pickupWindows[0],
  fulfillment: "collect" as const,
  notes: "",
};
const walkIn = {
  name: "Walk In",
  phone: "0900 000 0666",
  intake: "dropoff" as const,
  pickupDate: "",
  pickupWindow: "",
  address: "",
  landmark: "",
  serviceId: "1",
  fulfillment: "collect" as const,
  weightKg: "4",
  notes: "",
};

beforeEach(resetDemo);

describe("demo store", () => {
  it("starts with the sample orders, newest first, with payments and history", async () => {
    const orders = await demoBackend.listOrders();
    expect(orders).toHaveLength(SAMPLE_ORDERS.length);
    expect(orders.map((o) => o.status)).toContain("ready");
    expect(orders.map((o) => payState(o))).toEqual(expect.arrayContaining(["unpaid", "partial", "paid"]));
    expect([...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))).toEqual(orders);
    expect(orders.every((o) => o.history.length > 0)).toBe(true);
  });

  it("has something to show in today's summary", async () => {
    const day = dailySummary(await demoBackend.listOrders(), manilaDate());
    expect(day.received).toBeGreaterThan(0);
    expect(day.delivered).toBeGreaterThan(0);
    expect(day.collectedByPerson.length).toBeGreaterThan(1);
  });

  it("adds a request at the top as Requested, with the next number (A4, A5)", async () => {
    const { token } = await demoBackend.createOrder(DEMO_SHOP, request);
    const [first] = useDemoStore.getState().orders;
    expect(first).toMatchObject({
      token,
      number: SAMPLE_ORDERS.length + 1,
      status: "new",
      source: "form",
      customer: { name: "Demo Person", phone: "+639000000555" },
    });
  });

  it("reuses the customer for a known phone number", () => {
    const a = createDemoOrder(request);
    const b = createDemoOrder({ ...request, name: "Demo P." });
    const orders = useDemoStore.getState().orders;
    const [first, second] = [a, b].map((x) => orders.find((o) => o.id === x.id)!);
    expect(second.customer.id).toBe(first.customer.id);
    expect(first.customer.name).toBe("Demo P.");
  });

  it("rejects an invalid request", () => {
    expect(() => createDemoOrder({ ...request, phone: "123" })).toThrow();
  });

  it("adds a walk-in by hand, already at the shop and priced from its kilos (B5, C1)", () => {
    expect(createDemoManualOrder(walkIn)).toMatchObject({
      status: "picked_up",
      source: "manual",
      intake: "dropoff",
      pickupDate: manilaDate(),
      weightKg: 4,
      amountCentavos: 4 * 3500,
    });
  });

  it("applies changes and keeps a status history (B6)", async () => {
    const { id } = createDemoOrder(request);
    expect(updateDemoOrder(id, { weightKg: 6, amountCentavos: 21000 }).amountCentavos).toBe(21000);
    const ready = await demoBackend.updateOrder(id, { status: "ready", notified: true });
    expect(ready.notifiedAt).not.toBeNull();
    expect(ready.history.map((e) => e.status)).toEqual(["new", "ready"]);
    expect(updateDemoOrder(id, { serviceId: 2 })).toMatchObject({ service: "Wash, dry and iron", rateCentavos: 6000 });
    await expect(demoBackend.updateOrder(999, { status: "ready" })).rejects.toThrow();
  });

  it("records part payments up to the balance (C2, C3)", () => {
    const { id } = createDemoManualOrder(walkIn); // ₱140
    let order = addDemoPayment(id, { amountCentavos: 4000, method: "cash", collectedById: "staff" });
    expect([payState(order), balanceCentavos(order)]).toEqual(["partial", 10000]);
    expect(order.payments[0].collectedByName).toBe("Benjo Cruz");

    expect(() => addDemoPayment(id, { amountCentavos: 10001, method: "cash" })).toThrow("still owed");
    order = addDemoPayment(id, { amountCentavos: 10000, method: "gcash" });
    expect(payState(order)).toBe("paid");
    expect(order.payments[1].collectedByName).toBe("Rosa Dizon"); // defaults to "me", the owner
  });

  it("changing a price changes the rate on that service's orders (C1)", () => {
    saveDemoService({ id: 1, name: "Wash, dry and fold", pricePerKgCentavos: 4000, active: true });
    const order = useDemoStore.getState().orders.find((o) => o.serviceId === 1)!;
    expect(order.rateCentavos).toBe(4000);
    expect(() => saveDemoService({ name: "wash, dry and fold", pricePerKgCentavos: 1, active: true })).toThrow();
  });

  it("reset puts the samples back", () => {
    createDemoOrder(request);
    resetDemo();
    expect(useDemoStore.getState().orders).toHaveLength(SAMPLE_ORDERS.length);
  });
});

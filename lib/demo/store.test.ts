import { beforeEach, describe, expect, it } from "vitest";
import { manilaDate } from "../format";
import { samples } from "../sample-orders";
import { shop } from "../shop";
import { createDemoOrder, demoBackend, resetDemo, updateDemoOrder, useDemoStore } from "./store";

const request = {
  name: "Demo Person",
  phone: "0900 000 0555",
  address: "5 Demo St",
  landmark: "",
  service: shop.services[0].name,
  pickupDate: manilaDate(),
  pickupWindow: shop.pickupWindows[0],
  fulfillment: "collect" as const,
  notes: "",
};

beforeEach(resetDemo);

describe("demo store", () => {
  it("starts with the sample orders", async () => {
    const orders = await demoBackend.listOrders();
    expect(orders).toHaveLength(samples.length);
    expect(orders.map((o) => o.status)).toContain("ready");
  });

  it("adds a request as a new order with the next number", async () => {
    const { token } = await demoBackend.createOrder(request);
    const order = useDemoStore.getState().orders.find((o) => o.token === token);
    expect(order).toMatchObject({
      id: samples.length + 1,
      status: "new",
      paid: false,
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

  it("applies owner changes", async () => {
    const { id } = createDemoOrder(request);
    expect(updateDemoOrder(id, { paymentMethod: "cash", amountCentavos: 18000 })).toMatchObject({
      paid: true,
      paymentMethod: "cash",
      amountCentavos: 18000,
    });
    expect(updateDemoOrder(id, { paymentMethod: null })!.paid).toBe(false);
    const ready = await demoBackend.updateOrder(id, { status: "ready", notified: true });
    expect(ready.status).toBe("ready");
    expect(ready.notifiedAt).not.toBeNull();
    await expect(demoBackend.updateOrder(999, { status: "ready" })).rejects.toThrow();
  });

  it("reset puts the samples back", () => {
    createDemoOrder(request);
    resetDemo();
    expect(useDemoStore.getState().orders).toHaveLength(samples.length);
  });
});

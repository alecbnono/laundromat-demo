// The demo's "database": orders kept in the browser's memory (Zustand).
// Nothing here is sent to the server or saved anywhere. Refreshing the page starts over
// from the sample orders.
import { create } from "zustand";
import { ApiError } from "../api";
import type { Backend } from "../backend";
import { manilaDate, normalizePhone } from "../format";
import { samples } from "../sample-orders";
import type { Order, OrderPatch } from "../types";
import { pickupRequestSchema, type PickupRequest } from "../validation";

const now = () => new Date().toISOString();
const newToken = () => Math.random().toString(36).slice(2, 14);

function sampleOrders(): Order[] {
  const ts = now();
  return samples.map((s, i) => ({
    id: i + 1,
    token: newToken(),
    status: s.status,
    service: s.service,
    pickupDate: manilaDate(s.day),
    pickupWindow: s.window,
    fulfillment: s.fulfillment,
    address: s.address,
    landmark: s.landmark ?? "",
    notes: s.notes ?? "",
    weightKg: s.kg ?? null,
    amountCentavos: s.pesos != null ? s.pesos * 100 : null,
    paid: !!s.paid,
    paymentMethod: s.paid ?? null,
    notifiedAt: s.notified ? ts : null,
    createdAt: ts,
    updatedAt: ts,
    customer: { id: i + 1, name: s.name, phone: s.phone },
  }));
}

/** Same order as the real list: by pickup date, then order number. */
const sorted = (orders: Order[]) =>
  [...orders].sort((a, b) => a.pickupDate.localeCompare(b.pickupDate) || a.id - b.id);

export const useDemoStore = create<{ orders: Order[] }>(() => ({
  orders: sorted(sampleOrders()),
}));

export function createDemoOrder(data: PickupRequest): { id: number; token: string } {
  const { website: _website, name, phone: rawPhone, ...details } = pickupRequestSchema.parse(data);
  const phone = normalizePhone(rawPhone)!;
  const { orders } = useDemoStore.getState();
  const ts = now();

  // Like the real app: a known phone number is the same customer, with the latest name.
  const known = orders.find((o) => o.customer.phone === phone)?.customer;
  const customer = {
    id: known?.id ?? Math.max(0, ...orders.map((o) => o.customer.id)) + 1,
    name,
    phone,
  };
  const order: Order = {
    ...details,
    id: Math.max(0, ...orders.map((o) => o.id)) + 1,
    token: newToken(),
    status: "new",
    weightKg: null,
    amountCentavos: null,
    paid: false,
    paymentMethod: null,
    notifiedAt: null,
    createdAt: ts,
    updatedAt: ts,
    customer,
  };
  useDemoStore.setState({
    orders: sorted([
      ...orders.map((o) => (o.customer.id === customer.id ? { ...o, customer } : o)),
      order,
    ]),
  });
  return { id: order.id, token: order.token };
}

export function updateDemoOrder(id: number, patch: OrderPatch): Order | null {
  const { orders } = useDemoStore.getState();
  const old = orders.find((o) => o.id === id);
  if (!old) return null;
  const ts = now();
  const order: Order = { ...old, updatedAt: ts };
  if (patch.status !== undefined) order.status = patch.status;
  if (patch.weightKg !== undefined) order.weightKg = patch.weightKg;
  if (patch.amountCentavos !== undefined) order.amountCentavos = patch.amountCentavos;
  if (patch.paymentMethod !== undefined) {
    order.paymentMethod = patch.paymentMethod;
    order.paid = patch.paymentMethod !== null;
  }
  if (patch.notified !== undefined) order.notifiedAt = patch.notified ? ts : null;
  useDemoStore.setState({ orders: orders.map((o) => (o.id === id ? order : o)) });
  return order;
}

/** Puts the sample orders back. */
export const resetDemo = () => useDemoStore.setState({ orders: sorted(sampleOrders()) });

/** Drop-in replacement for the real API, used by the /demo pages. */
export const demoBackend: Backend = {
  demo: true,
  base: "/demo",
  ordersKey: ["demo-orders"],
  createOrder: async (data) => createDemoOrder(data),
  listOrders: async () => useDemoStore.getState().orders,
  updateOrder: async (id, patch) => {
    const order = updateDemoOrder(id, patch);
    if (!order) throw new ApiError(404, "Order not found.");
    return order;
  },
};

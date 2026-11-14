// The demo's "database": a sample shop kept in the browser's memory (Zustand).
// Nothing here is sent to the server or saved anywhere. Refreshing the page starts over
// from the samples. It follows the same rules as the real app (lib/db/*).
import { create } from "zustand";
import { ApiError } from "../api";
import type { Backend } from "../backend";
import { manilaDate, normalizePhone } from "../format";
import { balanceCentavos, totalFor } from "../money";
import {
  SAMPLE_ORDERS,
  SAMPLE_SERVICES,
  SAMPLE_SHOP,
  SAMPLE_TEAM,
  sampleTimeline,
} from "../sample-data";
import { newestFirst } from "../summary";
import type {
  Member,
  NewPayment,
  NewStaff,
  Order,
  OrderPatch,
  Service,
  ServiceInput,
  Shop,
  Status,
} from "../types";
import {
  manualOrderSchema,
  parseAmount,
  paymentSchema,
  pickupRequestSchema,
  serviceSchema,
  staffSchema,
  MAX_KG,
  type ManualOrder,
  type PickupRequest,
} from "../validation";

export const DEMO_SHOP: Shop = { id: 1, ...SAMPLE_SHOP };

const now = () => new Date().toISOString();
const newToken = () => Math.random().toString(36).slice(2, 14);
const nextId = (ids: number[]) => Math.max(0, ...ids) + 1;

interface DemoState {
  orders: Order[];
  services: Service[];
  team: Member[];
}

function samples(): DemoState {
  const services: Service[] = SAMPLE_SERVICES.map((s, i) => ({
    id: i + 1,
    name: s.name,
    pricePerKgCentavos: s.pesosPerKg * 100,
    active: true,
  }));
  const team: Member[] = SAMPLE_TEAM.map(({ key, name, email, role }) => ({
    id: key,
    name,
    email,
    role,
  }));
  const nameOf = (key: string) => team.find((m) => m.id === key)?.name ?? "Customer";
  const nowMs = Date.now();
  let paymentId = 0;

  const orders = SAMPLE_ORDERS.map((s, i): Order => {
    const t = sampleTimeline(s, i, nowMs);
    const service = services[s.service];
    const last = t.statuses[t.statuses.length - 1];
    return {
      id: i + 1,
      number: i + 1,
      token: newToken(),
      status: last.status,
      serviceId: service.id,
      service: service.name,
      rateCentavos: service.pricePerKgCentavos,
      intake: s.intake ?? "pickup",
      pickupDate: t.pickupDate,
      pickupWindow: s.window,
      fulfillment: s.fulfillment,
      address: s.address,
      landmark: s.landmark ?? "",
      notes: s.notes ?? "",
      weightKg: s.kg ?? null,
      amountCentavos: t.totalCentavos,
      source: s.intake === "dropoff" ? "manual" : "form",
      notifiedAt: t.notifiedAt,
      createdAt: t.createdAt,
      updatedAt: last.at,
      customer: { id: i + 1, name: s.name, phone: s.phone },
      payments: t.payments.map((p) => ({
        id: ++paymentId,
        amountCentavos: p.amountCentavos,
        method: p.method,
        collectedById: p.by,
        collectedByName: nameOf(p.by),
        at: p.at,
      })),
      history: t.statuses.map((e) => ({ status: e.status, at: e.at, byName: nameOf(e.by) })),
    };
  });
  return { orders: newestFirst(orders), services, team };
}

export const useDemoStore = create<DemoState>(samples);

/** Puts the samples back. */
export const resetDemo = () => useDemoStore.setState(samples());

/** The demo has no login: you are the sample shop's owner. */
export const demoMe = (): Member => useDemoStore.getState().team[0];

const formOptions = () => ({
  serviceIds: useDemoStore.getState().services.filter((s) => s.active).map((s) => s.id),
  pickupWindows: DEMO_SHOP.pickupWindows,
  maxDaysAhead: DEMO_SHOP.maxDaysAhead,
});

function addOrder(input: {
  name: string;
  phone: string;
  serviceId: number;
  status: Status;
  byName: string;
  details: Pick<
    Order,
    | "intake"
    | "pickupDate"
    | "pickupWindow"
    | "fulfillment"
    | "address"
    | "landmark"
    | "notes"
    | "source"
    | "weightKg"
  >;
}): Order {
  const { orders, services } = useDemoStore.getState();
  const ts = now();
  const service = services.find((s) => s.id === input.serviceId)!;
  // Like the real app: a known phone number is the same customer, with the latest name.
  const known = orders.find((o) => o.customer.phone === input.phone)?.customer;
  const customer = {
    id: known?.id ?? nextId(orders.map((o) => o.customer.id)),
    name: input.name,
    phone: input.phone,
  };
  const { weightKg } = input.details;
  const order: Order = {
    ...input.details,
    id: nextId(orders.map((o) => o.id)),
    number: nextId(orders.map((o) => o.number)),
    token: newToken(),
    status: input.status,
    serviceId: service.id,
    service: service.name,
    rateCentavos: service.pricePerKgCentavos,
    amountCentavos: weightKg != null ? totalFor(weightKg, service.pricePerKgCentavos) : null,
    notifiedAt: null,
    createdAt: ts,
    updatedAt: ts,
    customer,
    payments: [],
    history: [{ status: input.status, at: ts, byName: input.byName }],
  };
  useDemoStore.setState({
    orders: [order, ...orders.map((o) => (o.customer.id === customer.id ? { ...o, customer } : o))],
  });
  return order;
}

/** The public form (A4). */
export function createDemoOrder(data: PickupRequest): Order {
  const { website: _website, name, phone, serviceId, ...details } = pickupRequestSchema(
    formOptions(),
  ).parse(data);
  return addOrder({
    name,
    phone: normalizePhone(phone)!,
    serviceId: Number(serviceId),
    status: "new",
    byName: "Customer",
    details: { ...details, intake: "pickup", source: "form", weightKg: null },
  });
}

/** An order typed in by the shop (B5). */
export function createDemoManualOrder(data: ManualOrder): Order {
  const { name, phone, serviceId, weightKg, intake, ...details } = manualOrderSchema(
    formOptions(),
  ).parse(data);
  const dropOff = intake === "dropoff";
  return addOrder({
    name,
    phone: normalizePhone(phone)!,
    serviceId: Number(serviceId),
    status: dropOff ? "picked_up" : "new",
    byName: demoMe().name,
    details: {
      ...details,
      intake,
      source: "manual",
      weightKg: parseAmount(weightKg, MAX_KG) ?? null,
      ...(dropOff ? { pickupDate: manilaDate(), pickupWindow: "" } : {}),
    },
  });
}

function changeOrder(id: number, change: (order: Order, ts: string) => Order): Order {
  const { orders } = useDemoStore.getState();
  const old = orders.find((o) => o.id === id);
  if (!old) throw new ApiError(404, "Order not found.");
  const ts = now();
  const order = { ...change(old, ts), updatedAt: ts };
  useDemoStore.setState({ orders: orders.map((o) => (o.id === id ? order : o)) });
  return order;
}

export function updateDemoOrder(id: number, patch: OrderPatch): Order {
  return changeOrder(id, (old, ts) => {
    const { notified, serviceId, ...fields } = patch;
    const order: Order = { ...old, ...fields };
    if (serviceId !== undefined) {
      const service = useDemoStore.getState().services.find((s) => s.id === serviceId);
      if (!service) throw new ApiError(400, "That service is not offered by this shop.");
      Object.assign(order, {
        serviceId,
        service: service.name,
        rateCentavos: service.pricePerKgCentavos,
      });
    }
    if (notified !== undefined) order.notifiedAt = notified ? ts : null;
    if (patch.status !== undefined && patch.status !== old.status)
      order.history = [...old.history, { status: patch.status, at: ts, byName: demoMe().name }];
    return order;
  });
}

export function addDemoPayment(orderId: number, input: NewPayment): Order {
  const payment = paymentSchema.parse(input);
  return changeOrder(orderId, (order, ts) => {
    if (order.amountCentavos == null)
      throw new ApiError(400, "Set the order total before recording a payment.");
    if (payment.amountCentavos > balanceCentavos(order))
      throw new ApiError(400, "That is more than what is still owed on this order.");
    const { orders, team } = useDemoStore.getState();
    const collector = team.find((m) => m.id === (payment.collectedById ?? demoMe().id));
    if (!collector) throw new ApiError(400, "Choose who collected the payment.");
    return {
      ...order,
      payments: [
        ...order.payments,
        {
          id: nextId(orders.flatMap((o) => o.payments.map((p) => p.id))),
          amountCentavos: payment.amountCentavos,
          method: payment.method,
          collectedById: collector.id,
          collectedByName: collector.name,
          at: ts,
        },
      ],
    };
  });
}

export function removeDemoPayment(orderId: number, paymentId: number): Order {
  return changeOrder(orderId, (order) => ({
    ...order,
    payments: order.payments.filter((p) => p.id !== paymentId),
  }));
}

export function saveDemoService(input: ServiceInput): Service[] {
  const { id, ...values } = serviceSchema.parse(input);
  const { services, orders } = useDemoStore.getState();
  if (services.some((s) => s.id !== id && s.name.toLowerCase() === values.name.toLowerCase()))
    throw new ApiError(400, "There is already a service with that name.");
  const next =
    id == null
      ? [...services, { id: nextId(services.map((s) => s.id)), ...values }]
      : services.map((s) => (s.id === id ? { id, ...values } : s));
  useDemoStore.setState({
    services: next,
    // Orders show their service's current name and rate.
    orders: orders.map((o) =>
      o.serviceId === id
        ? { ...o, service: values.name, rateCentavos: values.pricePerKgCentavos }
        : o,
    ),
  });
  return next;
}

/** Adds a name to the demo's team list. No login is created: the demo has no logins. */
export function addDemoStaff(input: NewStaff): Member[] {
  const { name, email } = staffSchema.parse(input);
  const { team } = useDemoStore.getState();
  if (team.some((m) => m.email === email.toLowerCase()))
    throw new ApiError(400, "Someone at this shop already logs in with that email.");
  const next = [
    ...team,
    { id: `staff-${team.length}`, name, email: email.toLowerCase(), role: "staff" as const },
  ];
  useDemoStore.setState({ team: next });
  return next;
}

export function removeDemoStaff(id: string): Member[] {
  const next = useDemoStore.getState().team.filter((m) => m.id !== id || m.role === "owner");
  useDemoStore.setState({ team: next });
  return next;
}

/** `/demo`, or one of its views: /demo?v=orders */
const view = (v: string, extra = "") => `/demo?v=${v}${extra}`;

/** Drop-in replacement for the real API, used by the /demo page. */
export const demoBackend: Backend = {
  demo: true,
  networkMode: "always",
  paths: {
    form: () => "/demo",
    order: (token) => view("order", `&t=${token}`),
    orders: view("orders"),
    summary: view("summary"),
    settings: view("settings"),
  },
  keys: { orders: ["demo-orders"], services: ["demo-services"], team: ["demo-team"] },
  createOrder: async (_shop, data) => createDemoOrder(data),
  createManualOrder: async (data) => createDemoManualOrder(data),
  listOrders: async () => useDemoStore.getState().orders,
  updateOrder: async (id, patch) => updateDemoOrder(id, patch),
  addPayment: async (orderId, payment) => addDemoPayment(orderId, payment),
  removePayment: async (orderId, paymentId) => removeDemoPayment(orderId, paymentId),
  listServices: async () => useDemoStore.getState().services,
  saveService: async (service) => saveDemoService(service),
  listTeam: async () => useDemoStore.getState().team,
  addStaff: async (staff) => addDemoStaff(staff),
  removeStaff: async (id) => removeDemoStaff(id),
};

// Shared types and constants. No Node imports here, so client components can use it.
// The six records come from BUSINESS-REQUIREMENTS.md ("Data to store"): shop, user,
// service, customer, order, payment. Everything except a shop belongs to exactly one shop.

export const STATUSES = [
  "new",
  "picked_up",
  "washing",
  "ready",
  "completed",
  "cancelled",
] as const;
export type Status = (typeof STATUSES)[number];

/** Wording from requirement B2. */
export const STATUS_LABEL: Record<Status, string> = {
  new: "Requested",
  picked_up: "Picked up",
  washing: "Washing",
  ready: "Ready",
  completed: "Delivered",
  cancelled: "Cancelled",
};

/** How the laundry goes back to the customer. */
export const FULFILLMENTS = ["delivery", "collect"] as const;
export type Fulfillment = (typeof FULFILLMENTS)[number];

/** How the laundry reaches the shop: we pick it up, or the customer drops it off. */
export const INTAKES = ["pickup", "dropoff"] as const;
export type Intake = (typeof INTAKES)[number];

/** Where the order came from: the public form, or typed in by the shop (B5). */
export const SOURCES = ["form", "manual"] as const;
export type Source = (typeof SOURCES)[number];

export const PAYMENT_METHODS = ["cash", "gcash", "bank"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  bank: "Bank transfer",
};

export const ROLES = ["owner", "staff"] as const;
export type Role = (typeof ROLES)[number];

export interface Shop {
  id: number;
  /** The shop's part of its public form link: /s/<slug> */
  slug: string;
  name: string;
  tagline: string;
  /** Image address: a path such as /logo.svg, or the picture itself as a data: URL. */
  logo: string;
  phone: string; // +639XXXXXXXXX
  hours: string;
  pickupWindows: string[];
  /** How many days ahead a customer can book a pickup. */
  maxDaysAhead: number;
}

export interface Service {
  id: number;
  name: string;
  pricePerKgCentavos: number;
  /** Hidden services stay on old orders but are not offered for new ones. */
  active: boolean;
}

/** Someone who can log in to a shop: the owner or a staff member / rider. */
export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Payment {
  id: number;
  amountCentavos: number;
  method: PaymentMethod;
  /** Who took the money. The name is kept even if that login is later removed. */
  collectedById: string | null;
  collectedByName: string;
  at: string;
}

/** One line of an order's status history (B6). */
export interface StatusEvent {
  status: Status;
  at: string;
  byName: string;
}

export interface Order {
  id: number;
  /** The order number the shop sees. Counts up per shop: #1, #2, ... */
  number: number;
  token: string;
  status: Status;
  serviceId: number;
  service: string;
  /** The service's price per kilo right now, for working out the total. */
  rateCentavos: number;
  intake: Intake;
  pickupDate: string; // YYYY-MM-DD (Manila); for drop-offs, the day it was brought in
  pickupWindow: string; // "" for drop-offs
  fulfillment: Fulfillment;
  address: string;
  landmark: string;
  notes: string;
  weightKg: number | null;
  /** The order total. Usually kilos x rate, but the shop can type any amount. */
  amountCentavos: number | null;
  source: Source;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: number; name: string; phone: string };
  payments: Payment[];
  history: StatusEvent[];
}

/** A new order, from the public form or typed in by the shop. */
export interface NewOrderInput {
  name: string;
  phone: string; // normalized +639XXXXXXXXX
  address: string;
  landmark: string;
  serviceId: number;
  intake: Intake;
  pickupDate: string;
  pickupWindow: string;
  fulfillment: Fulfillment;
  notes: string;
  weightKg?: number | null;
  amountCentavos?: number | null;
}

/** Changes the shop can make to an order. Only the fields present are applied. */
export interface OrderPatch {
  status?: Status;
  weightKg?: number | null;
  amountCentavos?: number | null;
  serviceId?: number;
  address?: string;
  landmark?: string;
  notes?: string;
  notified?: boolean;
}

export interface NewPayment {
  amountCentavos: number;
  method: PaymentMethod;
  /** Defaults to the person recording it. */
  collectedById?: string;
}

export interface ServiceInput {
  id?: number;
  name: string;
  pricePerKgCentavos: number;
  active: boolean;
}

export interface NewStaff {
  name: string;
  email: string;
  password: string;
}

// Shared types and constants. No Node imports here, so client components can use it.
// The model is deliberately generic (customer, order, status, pickup/delivery, payment)
// so the same engine can serve other order/delivery businesses later.

export const STATUSES = [
  "new",
  "picked_up",
  "washing",
  "ready",
  "completed",
  "cancelled",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  new: "New request",
  picked_up: "Picked up",
  washing: "Washing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const FULFILLMENTS = ["delivery", "collect"] as const;
export type Fulfillment = (typeof FULFILLMENTS)[number];

export const PAYMENT_METHODS = ["cash", "gcash", "bank"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  bank: "Bank transfer",
};

export interface Order {
  id: number;
  token: string;
  status: Status;
  service: string;
  pickupDate: string; // YYYY-MM-DD (Manila)
  pickupWindow: string;
  fulfillment: Fulfillment;
  address: string;
  landmark: string;
  notes: string;
  weightKg: number | null;
  amountCentavos: number | null;
  paid: boolean;
  paymentMethod: PaymentMethod | null;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: number; name: string; phone: string };
}

export interface NewOrderInput {
  name: string;
  phone: string; // normalized +639XXXXXXXXX
  address: string;
  landmark: string;
  service: string;
  pickupDate: string;
  pickupWindow: string;
  fulfillment: Fulfillment;
  notes: string;
}

/** Changes the owner can make to an order. Only the fields present are applied. */
export interface OrderPatch {
  status?: Status;
  weightKg?: number | null;
  amountCentavos?: number | null;
  paymentMethod?: PaymentMethod | null; // null = mark as not paid
  notified?: boolean;
}

// Browser-side calls to our API routes. Used by TanStack Query hooks.
import type {
  Member,
  NewPayment,
  NewStaff,
  Order,
  OrderPatch,
  Service,
  ServiceInput,
} from "./types";
import type { ManualOrder, PickupRequest } from "./validation";

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string[]>;
  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(url: string, method = "GET", data?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      body: data === undefined ? undefined : JSON.stringify(data),
      headers: data === undefined ? undefined : { "content-type": "application/json" },
    });
  } catch {
    throw new ApiError(0, "No connection. Check your internet and try again.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error ?? "Something went wrong. Please try again.",
      body?.fieldErrors,
    );
  }
  return body as T;
}

export const api = {
  createOrder: (shopSlug: string, data: PickupRequest) =>
    request<{ token: string }>("/api/orders", "POST", { ...data, shop: shopSlug }),
  createManualOrder: (data: ManualOrder) =>
    request<Order>("/api/orders", "POST", { ...data, manual: true }),
  listOrders: () => request<Order[]>("/api/orders"),
  updateOrder: (id: number, patch: OrderPatch) =>
    request<Order>(`/api/orders/${id}`, "PATCH", patch),
  addPayment: (orderId: number, payment: NewPayment) =>
    request<Order>(`/api/orders/${orderId}/payments`, "POST", payment),
  removePayment: (orderId: number, paymentId: number) =>
    request<Order>(`/api/orders/${orderId}/payments/${paymentId}`, "DELETE"),
  listServices: () => request<Service[]>("/api/services"),
  saveService: (service: ServiceInput) => request<Service[]>("/api/services", "POST", service),
  listTeam: () => request<Member[]>("/api/team"),
  addStaff: (staff: NewStaff) => request<Member[]>("/api/team", "POST", staff),
  removeStaff: (id: string) => request<Member[]>(`/api/team/${id}`, "DELETE"),
};

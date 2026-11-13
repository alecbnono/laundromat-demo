// Browser-side calls to our API routes. Used by TanStack Query hooks.
import type { Order, OrderPatch } from "./types";
import type { PickupRequest } from "./validation";

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string[]>;
  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: init?.body ? { "content-type": "application/json" } : undefined,
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
  createOrder: (data: PickupRequest) =>
    request<{ token: string }>("/api/orders", { method: "POST", body: JSON.stringify(data) }),
  listOrders: () => request<Order[]>("/api/orders"),
  updateOrder: (id: number, patch: OrderPatch) =>
    request<Order>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
};

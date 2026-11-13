"use client";

// Where the screens get their orders from. The real pages talk to the API (and through it
// the database). The /demo pages swap in a copy that lives in the browser's memory.
import { createContext, useContext } from "react";
import { api } from "./api";
import type { Order, OrderPatch } from "./types";
import type { PickupRequest } from "./validation";

export interface Backend {
  demo: boolean;
  /** Prefix for page links: "" for the real app, "/demo" for the demo. */
  base: string;
  /** TanStack Query cache key for the order list. */
  ordersKey: string[];
  createOrder: (data: PickupRequest) => Promise<{ token: string }>;
  listOrders: () => Promise<Order[]>;
  updateOrder: (id: number, patch: OrderPatch) => Promise<Order>;
}

const realBackend: Backend = {
  demo: false,
  base: "",
  ordersKey: ["orders"],
  createOrder: api.createOrder,
  listOrders: api.listOrders,
  updateOrder: api.updateOrder,
};

const BackendContext = createContext<Backend>(realBackend);

export const BackendProvider = BackendContext.Provider;
export const useBackend = () => useContext(BackendContext);

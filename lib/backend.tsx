"use client";

// Where the screens get their data from, and where their links point. The real pages talk
// to the API (and through it the database). The /demo page swaps in a copy that lives in
// the browser's memory, so it needs no connection after it has loaded.
import { createContext, useContext } from "react";
import { api } from "./api";
import type {
  Member,
  NewPayment,
  NewStaff,
  Order,
  OrderPatch,
  Service,
  ServiceInput,
  Shop,
} from "./types";
import type { ManualOrder, PickupRequest } from "./validation";

export interface Backend {
  demo: boolean;
  /**
   * TanStack Query waits for a connection before it reads or saves ("online"). The demo's
   * data is in memory, so it must go ahead with the phone's data off ("always").
   */
  networkMode: "online" | "always";
  /** Page addresses. */
  paths: {
    form: (shop: Shop) => string;
    order: (token: string) => string;
    orders: string;
    summary: string;
    settings: string;
  };
  /** TanStack Query cache keys. */
  keys: { orders: string[]; services: string[]; team: string[] };
  createOrder: (shop: Shop, data: PickupRequest) => Promise<{ token: string }>;
  createManualOrder: (data: ManualOrder) => Promise<Order>;
  listOrders: () => Promise<Order[]>;
  updateOrder: (id: number, patch: OrderPatch) => Promise<Order>;
  addPayment: (orderId: number, payment: NewPayment) => Promise<Order>;
  removePayment: (orderId: number, paymentId: number) => Promise<Order>;
  listServices: () => Promise<Service[]>;
  saveService: (service: ServiceInput) => Promise<Service[]>;
  listTeam: () => Promise<Member[]>;
  addStaff: (staff: NewStaff) => Promise<Member[]>;
  removeStaff: (id: string) => Promise<Member[]>;
}

const realBackend: Backend = {
  demo: false,
  networkMode: "online",
  paths: {
    form: (shop) => `/s/${shop.slug}`,
    order: (token) => `/order/${token}`,
    orders: "/owner",
    summary: "/owner/summary",
    settings: "/owner/settings",
  },
  keys: { orders: ["orders"], services: ["services"], team: ["team"] },
  ...api,
  createOrder: (shop, data) => api.createOrder(shop.slug, data),
};

const BackendContext = createContext<Backend>(realBackend);
export const BackendProvider = BackendContext.Provider;
export const useBackend = () => useContext(BackendContext);

// --- The shop whose pages are showing, and (on the owner/staff screens) who is logged in.

const ShopContext = createContext<Shop | null>(null);
export const ShopProvider = ShopContext.Provider;
export function useShop(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("This screen needs a shop (wrap it in ShopProvider).");
  return shop;
}

const MeContext = createContext<Member | null>(null);
export const MeProvider = MeContext.Provider;
export function useMe(): Member {
  const me = useContext(MeContext);
  if (!me) throw new Error("This screen needs a logged-in person (wrap it in MeProvider).");
  return me;
}

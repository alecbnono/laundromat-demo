// Owner/staff screen UI state (Zustand): which filter is on, and the little confirmation
// toast. Server data (orders, services, team) lives in TanStack Query, not here.
import { create } from "zustand";
import type { Status } from "./types";

/** B4: "open" is everything not yet delivered or cancelled; "unpaid" is the C5 list. */
export type OrderFilter = "open" | Status | "unpaid";

interface OwnerUi {
  filter: OrderFilter;
  setFilter: (filter: OrderFilter) => void;
  toast: { id: number; text: string; error: boolean } | null;
  showToast: (text: string, error?: boolean) => void;
  clearToast: () => void;
}

export const useOwnerUi = create<OwnerUi>((set) => ({
  filter: "open",
  setFilter: (filter) => set({ filter }),
  toast: null,
  showToast: (text, error = false) => set({ toast: { id: Date.now(), text, error } }),
  clearToast: () => set({ toast: null }),
}));

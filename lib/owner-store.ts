// Owner screen UI state (Zustand): which tab is open, and the little confirmation toast.
// Server data (the orders) lives in TanStack Query, not here.
import { create } from "zustand";

export const OWNER_TABS = ["active", "ready", "done"] as const;
export type OwnerTab = (typeof OWNER_TABS)[number];

interface OwnerUi {
  tab: OwnerTab;
  setTab: (tab: OwnerTab) => void;
  toast: { id: number; text: string; error: boolean } | null;
  showToast: (text: string, error?: boolean) => void;
  clearToast: () => void;
}

export const useOwnerUi = create<OwnerUi>((set) => ({
  tab: "active",
  setTab: (tab) => set({ tab }),
  toast: null,
  showToast: (text, error = false) => set({ toast: { id: Date.now(), text, error } }),
  clearToast: () => set({ toast: null }),
}));

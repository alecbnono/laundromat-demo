"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { useBackend } from "@/lib/backend";
import { useOwnerUi } from "@/lib/owner-store";
import type { Order, OrderPatch } from "@/lib/types";

/** The order list. Re-checks every 30 seconds so new requests show up on their own. */
export function useOrders(initialOrders: Order[]) {
  const backend = useBackend();
  return useQuery({
    queryKey: backend.ordersKey,
    queryFn: backend.listOrders,
    initialData: initialOrders,
    refetchInterval: 30_000,
  });
}

/** Saves a change to one order and updates the list. `done` is the confirmation shown. */
export function useUpdateOrder() {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const showToast = useOwnerUi((s) => s.showToast);
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: OrderPatch; done?: string }) =>
      backend.updateOrder(id, patch),
    onSuccess: (order, { done }) => {
      queryClient.setQueryData<Order[]>(backend.ordersKey, (old) =>
        old?.map((o) => (o.id === order.id ? order : o)),
      );
      if (done) showToast(done);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.status === 401) window.location.assign("/owner/login");
      else showToast(e.message, true);
    },
  });
}

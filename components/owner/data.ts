"use client";

// The owner/staff screens' data: orders, services and team, kept fresh by TanStack Query.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { useBackend } from "@/lib/backend";
import { useOwnerUi } from "@/lib/owner-store";
import type { Member, Order, Service } from "@/lib/types";

/** The shop's orders. Re-checks every 30 seconds so new requests show up on their own (A5). */
export function useOrders(): Order[] {
  const backend = useBackend();
  return (
    useQuery({
      queryKey: backend.keys.orders,
      queryFn: backend.listOrders,
      refetchInterval: 30_000,
      networkMode: backend.networkMode,
    }).data ?? []
  );
}

/** True when the last attempt to refresh the order list failed. */
export function useOrdersStale(): boolean {
  const backend = useBackend();
  return useQuery({
    queryKey: backend.keys.orders,
    queryFn: backend.listOrders,
    networkMode: backend.networkMode,
  }).isError;
}

export function useServices(): Service[] {
  const backend = useBackend();
  return (
    useQuery({
      queryKey: backend.keys.services,
      queryFn: backend.listServices,
      networkMode: backend.networkMode,
    }).data ?? []
  );
}

export function useTeam(): Member[] {
  const backend = useBackend();
  return (
    useQuery({
      queryKey: backend.keys.team,
      queryFn: backend.listTeam,
      networkMode: backend.networkMode,
    }).data ?? []
  );
}

/** Shows a failed save. A lapsed login goes back to the login page. */
function useFailure() {
  const { demo } = useBackend();
  const showToast = useOwnerUi((s) => s.showToast);
  return (e: Error) => {
    if (!demo && e instanceof ApiError && e.status === 401) window.location.assign("/owner/login");
    else showToast(e.message, true);
  };
}

/**
 * Runs something that changes one order (a status change, a payment, a new order) and puts
 * the result in the list. `done` is the confirmation shown.
 */
export function useOrderChange() {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const showToast = useOwnerUi((s) => s.showToast);
  const onError = useFailure();
  const mutation = useMutation({
    networkMode: backend.networkMode,
    mutationFn: ({ act }: { act: () => Promise<Order>; done?: string }) => act(),
    onSuccess: (order, { done }) => {
      queryClient.setQueryData<Order[]>(backend.keys.orders, (old = []) =>
        old.some((o) => o.id === order.id)
          ? old.map((o) => (o.id === order.id ? order : o))
          : [order, ...old],
      );
      if (done) showToast(done);
    },
    onError,
  });
  return {
    busy: mutation.isPending,
    change: (act: () => Promise<Order>, done?: string) => mutation.mutate({ act, done }),
    /** Like `change`, but the caller handles a failure (to show it next to a form field). */
    changeAsync: (act: () => Promise<Order>, done?: string) => mutation.mutateAsync({ act, done }),
  };
}

/** Runs a Settings change that sends back the whole new list of services or team. */
export function useListChange<T>(list: "services" | "team") {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const showToast = useOwnerUi((s) => s.showToast);
  const onError = useFailure();
  const mutation = useMutation({
    networkMode: backend.networkMode,
    mutationFn: ({ act }: { act: () => Promise<T[]>; done?: string }) => act(),
    onSuccess: (items, { done }) => {
      queryClient.setQueryData(backend.keys[list], items);
      // Orders show their service's name and rate, so they may have changed too.
      if (list === "services") queryClient.invalidateQueries({ queryKey: backend.keys.orders });
      if (done) showToast(done);
    },
    onError,
  });
  return {
    busy: mutation.isPending,
    change: (act: () => Promise<T[]>, done?: string) => mutation.mutate({ act, done }),
    changeAsync: (act: () => Promise<T[]>, done?: string) => mutation.mutateAsync({ act, done }),
  };
}

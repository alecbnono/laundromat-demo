"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Search, X } from "lucide-react";
import AddOrderForm from "@/components/owner/AddOrderForm";
import { useOrders, useOrdersStale } from "@/components/owner/data";
import OrderCard from "@/components/owner/OrderCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOwnerUi, type OrderFilter } from "@/lib/owner-store";
import { matchesSearch, newestFirst, unpaidDelivered } from "@/lib/summary";
import { STATUSES, STATUS_LABEL, type Order } from "@/lib/types";

/** How many finished orders to draw at once; search reaches the rest. */
const MAX_SHOWN = 50;

const FILTERS: { key: OrderFilter; label: string; empty: string; pick: (o: Order[]) => Order[] }[] =
  [
    {
      key: "open",
      label: "Open",
      empty: "No open orders. New pickup requests will show up here.",
      pick: (orders) => orders.filter((o) => o.status !== "completed" && o.status !== "cancelled"),
    },
    ...STATUSES.map((status) => ({
      key: status,
      label: STATUS_LABEL[status],
      empty: `No orders are "${STATUS_LABEL[status]}" right now.`,
      pick: (orders: Order[]) => orders.filter((o) => o.status === status),
    })),
    {
      key: "unpaid",
      label: "Unpaid",
      empty: "Every delivered order is fully paid.",
      pick: unpaidDelivered, // C5: delivered but not fully paid, oldest first
    },
  ];

/** The order list (B1), with status filters and search (B4) and "Add order" (B5). */
export default function OrdersScreen() {
  const orders = newestFirst(useOrders());
  const stale = useOrdersStale();
  const filter = useOwnerUi((s) => s.filter);
  const setFilter = useOwnerUi((s) => s.setFilter);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const current = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const searching = query.trim() !== "";
  // A search looks through every order, whatever filter is on.
  const found = searching ? orders.filter((o) => matchesSearch(o, query)) : current.pick(orders);
  const shown = found.slice(0, MAX_SHOWN);

  return (
    <div className="grid gap-3.5">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="search"
            aria-label="Search by name or phone number"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant={adding ? "outline" : "default"} onClick={() => setAdding(!adding)}>
          {adding ? <X data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
          {adding ? "Close" : "Add order"}
        </Button>
      </div>

      {adding && <AddOrderForm onDone={() => setAdding(false)} />}

      <div
        role="group"
        aria-label="Filter by status"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
      >
        {FILTERS.map((f) => {
          const active = !searching && f.key === current.key;
          return (
            <Button
              key={f.key}
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => {
                setFilter(f.key);
                setQuery("");
              }}
            >
              {f.label}
              <Badge variant={active ? "outline" : "secondary"} className={active ? "border-white/40 text-white" : ""}>
                {f.pick(orders).length}
              </Badge>
            </Button>
          );
        })}
      </div>

      {stale && (
        <Alert variant="warning">
          <AlertDescription>
            Could not refresh the list. Showing the last orders loaded.
          </AlertDescription>
        </Alert>
      )}

      {searching && (
        <p className="text-sm text-muted-foreground">
          {found.length} of all orders match &quot;{query.trim()}&quot;.
        </p>
      )}
      {found.length === 0 && (
        <Alert variant="warning">
          <AlertDescription>
            {searching ? "No order matches that name or number." : current.empty}
          </AlertDescription>
        </Alert>
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {shown.map((o) => (
          <motion.div
            key={o.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            <OrderCard order={o} />
          </motion.div>
        ))}
      </AnimatePresence>

      {found.length > shown.length && (
        <p className="text-center text-sm text-muted-foreground">
          Showing {shown.length} of {found.length}. Search to find an older order.
        </p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut } from "lucide-react";
import OrderCard from "@/components/owner/OrderCard";
import Toast from "@/components/owner/Toast";
import { useOrders } from "@/components/owner/useOrders";
import PageFooter from "@/components/PageFooter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { useBackend } from "@/lib/backend";
import { peso } from "@/lib/format";
import { useOwnerUi, type OwnerTab } from "@/lib/owner-store";
import type { Order } from "@/lib/types";

const TABS: { key: OwnerTab; label: string; empty: string; match: (o: Order) => boolean }[] = [
  {
    key: "active",
    label: "To do",
    empty: "No open orders. New pickup requests will show up here.",
    match: (o) => ["new", "picked_up", "washing"].includes(o.status),
  },
  {
    key: "ready",
    label: "Ready",
    empty: "Nothing is waiting for delivery or collection.",
    match: (o) => o.status === "ready",
  },
  {
    key: "done",
    label: "Done",
    empty: "No completed or cancelled orders yet.",
    match: (o) => ["completed", "cancelled"].includes(o.status),
  },
];

export default function OrderBoard({ initialOrders }: { initialOrders: Order[] }) {
  const router = useRouter();
  const backend = useBackend();
  const { data: orders, isError } = useOrders(initialOrders);
  const tab = useOwnerUi((s) => s.tab);
  const setTab = useOwnerUi((s) => s.setTab);

  const current = TABS.find((t) => t.key === tab) ?? TABS[0];
  let shown = orders.filter(current.match);
  // Finished orders: most recently updated first.
  if (current.key === "done")
    shown = shown.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 50);

  const unpaidTotal = orders
    .filter((o) => !o.paid && o.status !== "cancelled" && o.amountCentavos != null)
    .reduce((sum, o) => sum + (o.amountCentavos ?? 0), 0);

  async function logout() {
    await authClient.signOut();
    router.push("/owner/login");
    router.refresh();
  }

  return (
    <>
      <Tabs
        value={current.key}
        onValueChange={(key) => setTab(key as OwnerTab)}
        className="mt-4 gap-3.5"
      >
        <TabsList aria-label="Order groups" className="w-full group-data-horizontal/tabs:h-12">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-base font-semibold">
              {t.label}
              <Badge variant={t.key === current.key ? "default" : "secondary"}>
                {orders.filter(t.match).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* One panel whose contents change with the tab, so cards can animate in and out. */}
        <TabsContent value={current.key} className="grid gap-3.5 text-base">
          {isError && (
            <Alert variant="warning">
              <AlertDescription>
                Could not refresh the list. Showing the last orders loaded.
              </AlertDescription>
            </Alert>
          )}

          {unpaidTotal > 0 && (
            <p className="text-muted-foreground">
              Unpaid so far: <strong className="text-foreground">{peso(unpaidTotal)}</strong>
            </p>
          )}

          {shown.length === 0 && (
            <Alert variant="warning">
              <AlertDescription>{current.empty}</AlertDescription>
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
        </TabsContent>
      </Tabs>

      <PageFooter>
        <p>
          <Link href={backend.base || "/"}>Open the customer form</Link>
        </p>
        {/* The demo has no login, so nothing to log out of. */}
        {!backend.demo && (
          <Button variant="link" size="sm" onClick={logout} className="underline">
            <LogOut data-icon="inline-start" /> Log out
          </Button>
        )}
      </PageFooter>
      <Toast />
    </>
  );
}

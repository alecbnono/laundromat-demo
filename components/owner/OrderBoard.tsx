"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LuLogOut } from "react-icons/lu";
import OrderCard from "@/components/owner/OrderCard";
import Toast from "@/components/owner/Toast";
import { useOrders } from "@/components/owner/useOrders";
import { LinkButton, Notice, PageFooter } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/cn";
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
      <div role="tablist" aria-label="Order groups" className="mt-4 mb-3.5 grid grid-cols-3 gap-1.5">
        {TABS.map((t) => {
          const active = t.key === current.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative flex min-h-[46px] items-center justify-center gap-1.5 rounded-[10px] border border-line bg-white font-semibold",
                active && "text-white",
              )}
            >
              {/* The blue highlight slides between tabs. */}
              {active && (
                <motion.span
                  layoutId="active-tab"
                  className="absolute -inset-px rounded-[10px] bg-brand"
                  transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                />
              )}
              <span className="relative">{t.label}</span>
              <b className="relative rounded-full bg-black/10 px-2 py-px text-[0.8rem]">
                {orders.filter(t.match).length}
              </b>
            </button>
          );
        })}
      </div>

      {isError && (
        <Notice>Could not refresh the list. Showing the last orders loaded.</Notice>
      )}

      {unpaidTotal > 0 && (
        <p className="mb-3.5 text-muted">
          Unpaid so far: <strong className="text-ink">{peso(unpaidTotal)}</strong>
        </p>
      )}

      {shown.length === 0 && <Notice>{current.empty}</Notice>}
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

      <PageFooter>
        <p>
          <Link href={backend.base || "/"}>Open the customer form</Link>
        </p>
        {/* The demo has no login, so nothing to log out of. */}
        {!backend.demo && (
          <LinkButton onClick={logout} className="inline-flex items-center gap-1.5">
            <LuLogOut aria-hidden /> Log out
          </LinkButton>
        )}
      </PageFooter>
      <Toast />
    </>
  );
}

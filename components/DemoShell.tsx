"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import AppLink from "@/components/AppLink";
import OrderStatus from "@/components/OrderStatus";
import DashShell from "@/components/owner/DashShell";
import OrdersScreen from "@/components/owner/OrdersScreen";
import SettingsScreen from "@/components/owner/SettingsScreen";
import SummaryScreen from "@/components/owner/SummaryScreen";
import RequestPage from "@/components/RequestPage";
import ShopHeader from "@/components/ShopHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BackendProvider, MeProvider, ShopProvider } from "@/lib/backend";
import { cn } from "@/lib/cn";
import { DEMO_SHOP, demoBackend, demoMe, resetDemo, useDemoStore } from "@/lib/demo/store";

const noop = () => () => {};
/** False on the server and during the first browser render, true after. */
const useInBrowser = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/**
 * Keeps a copy of this page and its files on the phone, so the demo still opens (and
 * survives a refresh) with the data connection off. See public/demo-sw.js.
 */
function useOfflineCopy() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/demo-sw.js", { scope: "/demo" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // The files this page already loaded: scripts, styles, the logo.
        const loaded = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => url.startsWith(window.location.origin));
        registration.active?.postMessage({ type: "keep", urls: ["/demo", ...loaded] });
      })
      .catch(() => {}); // The demo still works online without it.
  }, []);
}

/** The screen for the address: /demo is the customer form, /demo?v=... the other views. */
function DemoView({ view, token, isNew }: { view: string | null; token: string; isNew: boolean }) {
  const orders = useDemoStore((s) => s.orders);
  const services = useDemoStore((s) => s.services);
  const team = useDemoStore((s) => s.team);

  if (!view) return <RequestPage services={services.filter((s) => s.active)} />;

  if (view === "order") {
    const order = orders.find((o) => o.token === token);
    if (order) return <OrderStatus order={order} isNew={isNew} />;
    return (
      <>
        <ShopHeader />
        <Alert variant="warning" className="mt-3.5">
          <AlertDescription>
            This demo order is gone. Demo orders are only kept until the page is refreshed.{" "}
            <AppLink href="/demo">Start a new request</AppLink>
          </AlertDescription>
        </Alert>
      </>
    );
  }

  // No login here: you are the sample shop's owner.
  return (
    <MeProvider value={demoMe()}>
      <DashShell initial={{ orders, services, team }}>
        {view === "summary" ? (
          <SummaryScreen />
        ) : view === "settings" ? (
          <SettingsScreen />
        ) : (
          <OrdersScreen />
        )}
      </DashShell>
    </MeProvider>
  );
}

function Demo() {
  const params = useSearchParams();
  const view = params.get("v");
  const queryClient = useQueryClient();
  // The demo's data exists only in this browser, so there is nothing to render on the server.
  const inBrowser = useInBrowser();
  const onCustomer = !view || view === "order";
  useOfflineCopy();

  function reset() {
    resetDemo();
    for (const queryKey of Object.values(demoBackend.keys))
      queryClient.invalidateQueries({ queryKey });
  }

  const tab = (href: string, label: string, active: boolean) => (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className={cn(
        "min-w-0 flex-1 px-1.5 text-warning no-underline hover:bg-transparent hover:text-warning",
        active && "bg-card text-foreground shadow-sm hover:bg-card hover:text-foreground",
      )}
    >
      <AppLink href={href} aria-current={active ? "page" : undefined}>
        {label}
      </AppLink>
    </Button>
  );

  return (
    <>
      <aside className="mb-4 grid gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
        <p>
          <strong>Demo.</strong> Sample data only. Nothing is saved or sent to the shop, and
          refreshing the page starts over.
        </p>
        <div className="flex items-center gap-1.5">
          <nav
            aria-label="Demo views"
            className="flex min-w-0 flex-1 gap-1 rounded-lg bg-black/5 p-1"
          >
            {tab("/demo", "Customer view", onCustomer)}
            {tab(demoBackend.paths.orders, "Owner view", !onCustomer)}
          </nav>
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="px-1.5 text-warning hover:bg-black/5 hover:text-warning"
          >
            <RotateCcw data-icon="inline-start" /> Reset
          </Button>
        </div>
      </aside>
      {inBrowser && (
        // key: switching between the customer and owner sides starts that side afresh.
        <DemoView
          key={onCustomer ? "customer" : "owner"}
          view={view}
          token={params.get("t") ?? ""}
          isNew={params.get("new") === "1"}
        />
      )}
    </>
  );
}

/**
 * The whole demo on one page (/demo): the customer form and the owner's screens, running on
 * sample data in the browser's memory. After the first load it needs no connection.
 */
export default function DemoShell() {
  return (
    <BackendProvider value={demoBackend}>
      <ShopProvider value={DEMO_SHOP}>
        <Suspense>
          <Demo />
        </Suspense>
      </ShopProvider>
    </BackendProvider>
  );
}

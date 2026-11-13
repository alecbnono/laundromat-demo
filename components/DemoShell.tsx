"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackendProvider } from "@/lib/backend";
import { cn } from "@/lib/cn";
import { demoBackend, resetDemo } from "@/lib/demo/store";

const noop = () => () => {};
/** False on the server and during the first browser render, true after. */
const useInBrowser = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/**
 * Wraps the /demo pages: points them at the in-memory orders instead of the real API, and
 * shows the banner that says so.
 */
export default function DemoShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  // The demo orders exist only in this browser, so there is nothing to render on the server.
  const inBrowser = useInBrowser();
  const onOwner = pathname.startsWith("/demo/owner");

  function reset() {
    resetDemo();
    queryClient.invalidateQueries({ queryKey: demoBackend.ordersKey });
  }

  const tab = (href: string, label: string, active: boolean) => (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className={cn(
        "flex-1 text-warning no-underline hover:bg-transparent hover:text-warning",
        active && "bg-card text-foreground shadow-sm hover:bg-card hover:text-foreground",
      )}
    >
      <Link href={href} aria-current={active ? "page" : undefined}>
        {label}
      </Link>
    </Button>
  );

  return (
    <BackendProvider value={demoBackend}>
      <aside className="mb-4 grid gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
        <p>
          <strong>Demo.</strong> Sample data only. Nothing is saved or sent to the shop, and
          refreshing the page starts over.
        </p>
        <div className="flex items-center gap-1.5">
          <nav aria-label="Demo views" className="flex flex-1 gap-1 rounded-lg bg-black/5 p-1">
            {tab("/demo", "Customer view", !onOwner)}
            {tab("/demo/owner", "Owner view", onOwner)}
          </nav>
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="text-warning hover:bg-black/5 hover:text-warning"
          >
            <RotateCcw data-icon="inline-start" /> Reset
          </Button>
        </div>
      </aside>
      {inBrowser ? children : null}
    </BackendProvider>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LuRotateCcw } from "react-icons/lu";
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
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 flex-1 items-center justify-center rounded-lg font-semibold no-underline",
        active ? "bg-white text-ink shadow-sm" : "text-[#4a3500]",
      )}
    >
      {label}
    </Link>
  );

  return (
    <BackendProvider value={demoBackend}>
      <aside className="mb-4 grid gap-2 rounded-xl bg-warn-bg p-3 text-[0.9rem] text-[#4a3500]">
        <p>
          <strong>Demo.</strong> Sample data only. Nothing is saved or sent to the shop, and
          refreshing the page starts over.
        </p>
        <div className="flex items-center gap-1.5">
          <nav aria-label="Demo views" className="flex flex-1 gap-1 rounded-[10px] bg-black/5 p-1">
            {tab("/demo", "Customer view", !onOwner)}
            {tab("/demo/owner", "Owner view", onOwner)}
          </nav>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 items-center gap-1.5 px-2 font-semibold underline"
          >
            <LuRotateCcw aria-hidden /> Reset
          </button>
        </div>
      </aside>
      {inBrowser ? children : null}
    </BackendProvider>
  );
}

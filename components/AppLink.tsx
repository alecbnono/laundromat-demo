"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { useBackend } from "@/lib/backend";

/**
 * Goes to another screen. In the demo this only changes the address bar (no request to the
 * server), which is what lets the demo keep working with the phone's data switched off.
 */
export function useGo() {
  const { demo } = useBackend();
  const router = useRouter();
  return (href: string) => {
    if (!demo) return router.push(href);
    window.history.pushState(null, "", href);
    window.scrollTo(0, 0);
  };
}

/** A link between the app's own screens. See useGo. */
export default function AppLink({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  const { demo } = useBackend();
  const go = useGo();
  if (!demo) return <Link href={href} onClick={onClick} {...props} />;
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        // Leave ctrl/cmd-click (open in a new tab) to the browser.
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        go(href);
      }}
      {...props}
    />
  );
}

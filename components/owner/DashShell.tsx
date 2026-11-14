"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import AppLink from "@/components/AppLink";
import Toast from "@/components/owner/Toast";
import PageFooter from "@/components/PageFooter";
import ShopHeader from "@/components/ShopHeader";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useBackend, useMe, useShop } from "@/lib/backend";
import { cn } from "@/lib/cn";
import type { Member, Order, Service } from "@/lib/types";

export interface DashData {
  orders: Order[];
  services: Service[];
  team: Member[];
}

/**
 * The frame around the owner/staff screens: shop name, who is logged in, the links between
 * Orders, Summary and Settings, and the confirmation toast. `initial` is the data sent with
 * the page so the screens show at once; the browser then keeps it fresh.
 */
export default function DashShell({ initial, children }: { initial: DashData; children: ReactNode }) {
  const backend = useBackend();
  const shop = useShop();
  const me = useMe();
  const router = useRouter();
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setQueryData(backend.keys.orders, initial.orders);
    queryClient.setQueryData(backend.keys.services, initial.services);
    queryClient.setQueryData(backend.keys.team, initial.team);
  });

  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = search ? `${pathname}?${search}` : pathname;
  const owner = me.role === "owner";
  const links = [
    { href: backend.paths.orders, label: "Orders" },
    { href: backend.paths.summary, label: owner ? "Summary" : "My collections" },
    ...(owner ? [{ href: backend.paths.settings, label: "Settings" }] : []),
  ];

  async function logout() {
    await authClient.signOut();
    router.push("/owner/login");
    router.refresh();
  }

  return (
    <>
      <ShopHeader subtitle={`${me.name} · ${owner ? "Owner" : "Staff"}`} />
      <nav aria-label="Screens" className="mt-4 mb-3.5 flex gap-1 rounded-lg bg-muted p-1">
        {links.map((link) => {
          const active = here === link.href;
          return (
            <AppLink
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 flex-1 items-center justify-center rounded-md px-2 text-center font-semibold no-underline",
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              {link.label}
            </AppLink>
          );
        })}
      </nav>

      {children}

      <PageFooter>
        <p>
          <AppLink href={backend.paths.form(shop)}>Open the customer form</AppLink>
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

"use client";

import type { ReactNode } from "react";
import { MeProvider, ShopProvider } from "@/lib/backend";
import type { Member, Shop } from "@/lib/types";

/** Tells the screens inside which shop they belong to and, when logged in, who is using them. */
export default function ShopScope({
  shop,
  me = null,
  children,
}: {
  shop: Shop;
  me?: Member | null;
  children: ReactNode;
}) {
  return (
    <ShopProvider value={shop}>
      <MeProvider value={me}>{children}</MeProvider>
    </ShopProvider>
  );
}

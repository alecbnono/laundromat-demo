"use client";

import OrderBoard from "@/components/owner/OrderBoard";
import ShopHeader from "@/components/ShopHeader";
import { useDemoStore } from "@/lib/demo/store";

// No login here: the demo's orders are samples that live in this browser only.
export default function DemoOwner() {
  return (
    <>
      <ShopHeader subtitle="Order list" />
      <OrderBoard initialOrders={useDemoStore.getState().orders} />
    </>
  );
}

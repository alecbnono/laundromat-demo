"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import OrderStatus from "@/components/OrderStatus";
import ShopHeader from "@/components/ShopHeader";
import { Notice } from "@/components/ui";
import { useDemoStore } from "@/lib/demo/store";

export default function DemoOrder() {
  const { token } = useParams<{ token: string }>();
  const isNew = useSearchParams().get("new") === "1";
  const order = useDemoStore((s) => s.orders.find((o) => o.token === token));

  if (!order) {
    return (
      <>
        <ShopHeader />
        <Notice>
          This demo order is gone. Demo orders are only kept until the page is refreshed.{" "}
          <Link href="/demo">Start a new request</Link>
        </Notice>
      </>
    );
  }
  return <OrderStatus order={order} isNew={isNew} formHref="/demo" />;
}

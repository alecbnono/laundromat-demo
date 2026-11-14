import { notFound } from "next/navigation";
import OrderStatus from "@/components/OrderStatus";
import ShopScope from "@/components/ShopScope";
import { getOrderByToken } from "@/lib/db/orders";
import { getShop } from "@/lib/db/shops";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order", robots: { index: false } };

/** A4: the confirmation screen a customer lands on after sending the form. */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const found = await getOrderByToken((await params).token);
  const shop = found && (await getShop(found.shopId));
  if (!found || !shop) notFound();
  // The customer's browser gets the amounts, but not who handled the order or the money.
  const order = {
    ...found.order,
    history: [],
    payments: found.order.payments.map((p) => ({ ...p, collectedById: null, collectedByName: "" })),
  };
  return (
    <ShopScope shop={shop}>
      <OrderStatus order={order} isNew={(await searchParams).new === "1"} />
    </ShopScope>
  );
}

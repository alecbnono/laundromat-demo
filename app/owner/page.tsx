import { redirect } from "next/navigation";
import OrderBoard from "@/components/owner/OrderBoard";
import ShopHeader from "@/components/ShopHeader";
import { listOrders } from "@/lib/db/orders";
import { getOwnerSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders", robots: { index: false } };

export default async function OwnerPage() {
  if (!(await getOwnerSession())) redirect("/owner/login");
  return (
    <>
      <ShopHeader subtitle="Order list" />
      {/* Sent with the page so the list shows at once; the browser then keeps it fresh. */}
      <OrderBoard initialOrders={await listOrders()} />
    </>
  );
}

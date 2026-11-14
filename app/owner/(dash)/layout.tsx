import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashShell from "@/components/owner/DashShell";
import ShopScope from "@/components/ShopScope";
import { listOrders } from "@/lib/db/orders";
import { getShop, listServices } from "@/lib/db/shops";
import { listTeam } from "@/lib/db/team";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orders", robots: { index: false } };

/** The owner/staff screens. Everything loaded here is limited to the login's own shop (D1). */
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/owner/login");
  const { shopId, me } = session;
  const [shop, orders, services, team] = await Promise.all([
    getShop(shopId),
    listOrders(shopId),
    listServices(shopId),
    listTeam(shopId),
  ]);
  if (!shop) redirect("/owner/login");
  return (
    <ShopScope shop={shop} me={me}>
      {/* Sent with the page so the screens show at once; the browser then keeps it fresh. */}
      <DashShell initial={{ orders, services, team }}>{children}</DashShell>
    </ShopScope>
  );
}

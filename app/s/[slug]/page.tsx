import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopScope from "@/components/ShopScope";
import RequestPage from "@/components/RequestPage";
import { getShopBySlug, listServices } from "@/lib/db/shops";

// The allowed pickup dates depend on today's date, so render per request.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shop = await getShopBySlug((await params).slug);
  return shop
    ? { title: shop.name, description: `Request a laundry pickup from ${shop.name}.` }
    : {};
}

/** A1: a shop's own public form. */
export default async function ShopForm({ params }: Props) {
  const shop = await getShopBySlug((await params).slug);
  if (!shop) notFound();
  return (
    <ShopScope shop={shop}>
      <RequestPage services={await listServices(shop.id, { activeOnly: true })} />
    </ShopScope>
  );
}

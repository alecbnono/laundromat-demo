"use client";

import PageFooter from "@/components/PageFooter";
import PickupForm from "@/components/PickupForm";
import ShopHeader from "@/components/ShopHeader";
import { useShop } from "@/lib/backend";
import { displayPhone } from "@/lib/format";
import type { Service } from "@/lib/types";

/** A shop's public pickup request screen (A1). Shared by /s/<shop> and /demo. */
export default function RequestPage({ services }: { services: Service[] }) {
  const shop = useShop();
  return (
    <>
      <ShopHeader />
      <h2 className="mt-5 mb-1 text-[1.35rem] font-bold">Request a laundry pickup</h2>
      <p className="mb-3.5 text-muted-foreground">
        Fill this in and we will come to you. No account needed.
      </p>
      <PickupForm services={services} />
      <PageFooter>
        {shop.hours && <p>{shop.hours}</p>}
        <p>
          Questions? Call or text <a href={`tel:${shop.phone}`}>{displayPhone(shop.phone)}</a>
        </p>
      </PageFooter>
    </>
  );
}

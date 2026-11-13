import PageFooter from "@/components/PageFooter";
import PickupForm from "@/components/PickupForm";
import ShopHeader from "@/components/ShopHeader";
import { displayPhone, manilaDate } from "@/lib/format";
import { shop } from "@/lib/shop";

/** The customer's pickup request screen. Shared by / and /demo. */
export default function RequestPage() {
  return (
    <>
      <ShopHeader />
      <h2 className="mt-5 mb-1 text-[1.35rem] font-bold">Request a laundry pickup</h2>
      <p className="mb-3.5 text-muted-foreground">
        Fill this in and we will come to you. No account needed.
      </p>
      <PickupForm
        services={shop.services}
        windows={shop.pickupWindows}
        minDate={manilaDate()}
        maxDate={manilaDate(shop.maxDaysAhead)}
      />
      <PageFooter>
        <p>{shop.hours}</p>
        <p>
          Questions? Call or text <a href={`tel:${shop.phone}`}>{displayPhone(shop.phone)}</a>
        </p>
      </PageFooter>
    </>
  );
}

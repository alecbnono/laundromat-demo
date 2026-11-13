import Link from "next/link";
import ShopHeader from "@/components/ShopHeader";
import { Notice, PageFooter, Summary, cardClass } from "@/components/ui";
import { cn } from "@/lib/cn";
import { displayPhone, formatDay, peso } from "@/lib/format";
import { shop } from "@/lib/shop";
import type { Order, Status } from "@/lib/types";

const STEPS: { status: Status; label: string }[] = [
  { status: "new", label: "Request received" },
  { status: "picked_up", label: "Picked up" },
  { status: "washing", label: "Washing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

/** The customer's order status screen. Shared by /order/<token> and /demo/order/<token>. */
export default function OrderStatus({
  order,
  isNew,
  formHref,
}: {
  order: Order;
  isNew: boolean;
  formHref: string;
}) {
  const current = STEPS.findIndex((s) => s.status === order.status);

  return (
    <>
      <ShopHeader />
      {isNew && order.status === "new" ? (
        <Notice tone="success">
          <strong>Request sent!</strong> We will pick up your laundry{" "}
          {formatDay(order.pickupDate).toLowerCase()}, {order.pickupWindow}.
        </Notice>
      ) : null}

      <h2 className="mt-5 mb-1 text-[1.35rem] font-bold">Order #{order.id}</h2>
      <p className="mb-3.5 text-muted">
        Keep this page open or save the link to check your order.
      </p>

      {order.status === "cancelled" ? (
        <Notice>This order was cancelled.</Notice>
      ) : (
        <ol className={cn(cardClass, "grid gap-2.5")}>
          {STEPS.map((s, i) => (
            <li
              key={s.status}
              aria-current={i === current ? "step" : undefined}
              className={cn(
                "flex items-center gap-3",
                i > current && "text-muted",
                i === current && "font-bold",
              )}
            >
              <span
                className={cn(
                  "size-4 flex-none rounded-full border-2",
                  i < current && "border-ok bg-ok",
                  i === current && "border-brand bg-brand ring-4 ring-[#cfe5fb]",
                  i > current && "border-field bg-white",
                )}
              />
              {s.label}
            </li>
          ))}
        </ol>
      )}

      <div className={cardClass}>
        <Summary
          rows={[
            ["Service", order.service],
            ["Pickup", `${formatDay(order.pickupDate)}, ${order.pickupWindow}`],
            ["Address", order.address + (order.landmark ? ` (${order.landmark})` : "")],
            ["Return", order.fulfillment === "delivery" ? "Delivery" : "Collect at shop"],
            ...(order.amountCentavos != null
              ? [
                  [
                    "Total",
                    `${peso(order.amountCentavos)} ${order.paid ? "(paid)" : "(unpaid)"}`,
                  ] as [string, string],
                ]
              : []),
          ]}
        />
      </div>

      <PageFooter>
        <p>
          Need to change something? Call or text{" "}
          <a href={`tel:${shop.phone}`}>{displayPhone(shop.phone)}</a>
        </p>
        <p>
          <Link href={formHref}>Request another pickup</Link>
        </p>
      </PageFooter>
    </>
  );
}

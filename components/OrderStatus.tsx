"use client";

import AppLink from "@/components/AppLink";
import PageFooter from "@/components/PageFooter";
import SaveLink from "@/components/SaveLink";
import ShopHeader from "@/components/ShopHeader";
import Summary from "@/components/Summary";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { useBackend, useShop } from "@/lib/backend";
import { cn } from "@/lib/cn";
import { displayPhone, formatDay, peso } from "@/lib/format";
import { balanceCentavos } from "@/lib/money";
import type { Order, Status } from "@/lib/types";

const STEPS: { status: Status; label: string }[] = [
  { status: "new", label: "Request received" },
  { status: "picked_up", label: "Picked up" },
  { status: "washing", label: "Washing" },
  { status: "ready", label: "Ready" },
  { status: "completed", label: "Completed" },
];

/**
 * The customer's confirmation screen (A4), reached by the order's private link. It also
 * shows how far the order has got. Shared by /order/<token> and the demo.
 */
export default function OrderStatus({ order, isNew }: { order: Order; isNew: boolean }) {
  const shop = useShop();
  const backend = useBackend();
  const current = STEPS.findIndex((s) => s.status === order.status);
  const due = balanceCentavos(order);
  const pickup = order.intake === "pickup";

  return (
    <>
      <ShopHeader />
      {isNew && order.status === "new" ? (
        <Alert variant="success" className="mt-3.5">
          <AlertTitle>Request sent!</AlertTitle>
          <AlertDescription>
            We will pick up your laundry {formatDay(order.pickupDate).toLowerCase()},{" "}
            {order.pickupWindow}.
          </AlertDescription>
        </Alert>
      ) : null}

      <h2 className="mt-5 mb-1 text-[1.35rem] font-bold">Order #{order.number}</h2>
      <p className="mb-2.5 text-muted-foreground">
        This page shows your order as it moves along. Save the link to come back to it.
      </p>
      <div className="mb-3.5">
        <SaveLink title={`${shop.name}: order #${order.number}`} />
      </div>

      <div className="grid gap-3.5">
        {order.status === "cancelled" ? (
          <Alert variant="warning">
            <AlertDescription>This order was cancelled.</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardContent>
              <ol className="grid gap-2.5">
                {STEPS.map((s, i) => (
                  <li
                    key={s.status}
                    aria-current={i === current ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-3",
                      i > current && "text-muted-foreground",
                      i === current && "font-bold",
                    )}
                  >
                    <span
                      className={cn(
                        "size-4 flex-none rounded-full border-2",
                        i < current && "border-success bg-success",
                        i === current && "border-primary bg-primary ring-4 ring-primary/20",
                        i > current && "border-input bg-card",
                      )}
                    />
                    {s.label}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <Summary
              rows={[
                ["Service", order.service],
                pickup
                  ? ["Pickup", `${formatDay(order.pickupDate)}, ${order.pickupWindow}`]
                  : ["Received", `Dropped off at the shop, ${formatDay(order.pickupDate)}`],
                ...(order.address
                  ? [
                      [
                        "Address",
                        order.address + (order.landmark ? ` (${order.landmark})` : ""),
                      ] as [string, string],
                    ]
                  : []),
                ["Return", order.fulfillment === "delivery" ? "Delivery" : "Collect at shop"],
                ...(order.amountCentavos != null
                  ? [
                      [
                        "Total",
                        `${peso(order.amountCentavos)} ${
                          due === 0
                            ? "(paid)"
                            : due === order.amountCentavos
                              ? "(unpaid)"
                              : `(${peso(due)} still to pay)`
                        }`,
                      ] as [string, string],
                    ]
                  : []),
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <PageFooter>
        <p>
          Need to change something? Call or text{" "}
          <a href={`tel:${shop.phone}`}>{displayPhone(shop.phone)}</a>
        </p>
        <p>
          <AppLink href={backend.paths.form(shop)}>Request another pickup</AppLink>
        </p>
      </PageFooter>
    </>
  );
}

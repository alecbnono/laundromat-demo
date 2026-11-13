"use client";

import { useId, type ComponentProps } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Phone, Save, Store, Truck, Undo2 } from "lucide-react";
import ReadyMessage from "@/components/owner/ReadyMessage";
import { useUpdateOrder } from "@/components/owner/useOrders";
import Summary from "@/components/Summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { displayPhone, formatDateTime, formatDay, peso, readyMessage } from "@/lib/format";
import { shop } from "@/lib/shop";
import {
  PAYMENT_LABEL,
  PAYMENT_METHODS,
  STATUS_LABEL,
  type Order,
  type OrderPatch,
  type Status,
} from "@/lib/types";
import {
  MAX_KG,
  MAX_PESOS,
  billingFormSchema,
  parseAmount,
  type BillingForm,
} from "@/lib/validation";

function nextStep(order: Order): { status: Status; label: string } | null {
  switch (order.status) {
    case "new":
      return { status: "picked_up", label: "Mark picked up" };
    case "picked_up":
      return { status: "washing", label: "Start washing" };
    case "washing":
      return { status: "ready", label: "Mark ready" };
    case "ready":
      return {
        status: "completed",
        label: order.fulfillment === "delivery" ? "Mark delivered" : "Mark collected",
      };
    default:
      return null;
  }
}

const PREVIOUS: Partial<Record<Status, Status>> = {
  picked_up: "new",
  washing: "picked_up",
  ready: "washing",
  completed: "ready",
  cancelled: "new",
};

const STATUS_BADGE: Record<Status, ComponentProps<typeof Badge>["variant"]> = {
  new: "warning",
  picked_up: "info",
  washing: "info",
  ready: "success",
  completed: "secondary",
  cancelled: "destructive",
};

function BillingFields({
  order,
  disabled,
  onSave,
}: {
  order: Order;
  disabled: boolean;
  onSave: (patch: OrderPatch) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BillingForm>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      weightKg: order.weightKg?.toString() ?? "",
      amount: order.amountCentavos != null ? String(order.amountCentavos / 100) : "",
    },
  });

  const save = handleSubmit(({ weightKg, amount }) => {
    const pesos = parseAmount(amount, MAX_PESOS) ?? null;
    onSave({
      weightKg: parseAmount(weightKg, MAX_KG) ?? null,
      amountCentavos: pesos == null ? null : Math.round(pesos * 100),
    });
  });

  // Several cards are on screen at once, so the field ids must differ per card.
  const id = useId();

  return (
    <form onSubmit={save} noValidate className="grid gap-2">
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <Field className="gap-1">
          <FieldLabel htmlFor={`${id}-kg`} className="font-normal text-muted-foreground">
            Kilos
          </FieldLabel>
          <Input
            {...register("weightKg")}
            id={`${id}-kg`}
            inputMode="decimal"
            placeholder="0"
            aria-invalid={!!errors.weightKg}
          />
        </Field>
        <Field className="gap-1">
          <FieldLabel htmlFor={`${id}-amount`} className="font-normal text-muted-foreground">
            Amount (₱)
          </FieldLabel>
          <Input
            {...register("amount")}
            id={`${id}-amount`}
            inputMode="decimal"
            placeholder="0"
            aria-invalid={!!errors.amount}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={disabled}>
          <Save data-icon="inline-start" /> Save
        </Button>
      </div>
      <FieldError>{errors.weightKg?.message ?? errors.amount?.message}</FieldError>
    </form>
  );
}

export default function OrderCard({ order }: { order: Order }) {
  const update = useUpdateOrder();
  const busy = update.isPending;
  const change = (patch: OrderPatch, done?: string) =>
    update.mutate({ id: order.id, patch, done });

  const next = nextStep(order);
  const previous = PREVIOUS[order.status];
  const closed = order.status === "completed" || order.status === "cancelled";
  const delivery = order.fulfillment === "delivery";

  return (
    <article data-order-id={order.id}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="font-bold">
              #{order.id} · {order.customer.name}
            </h3>
          </CardTitle>
          <CardDescription>
            <a
              href={`tel:${order.customer.phone}`}
              className="inline-flex items-center gap-1.5 text-base"
            >
              <Phone className="size-4" /> {displayPhone(order.customer.phone)}
            </a>
          </CardDescription>
          <CardAction>
            <Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="grid gap-3.5">
          <Summary
            rows={[
              ["Pickup", `${formatDay(order.pickupDate)}, ${order.pickupWindow}`],
              ["Address", order.address + (order.landmark ? ` (${order.landmark})` : "")],
              ["Service", order.service],
              [
                "Return",
                <span key="return" className="inline-flex items-center gap-1.5">
                  {delivery ? <Truck className="size-4" /> : <Store className="size-4" />}
                  {delivery ? "Deliver" : "Customer collects"}
                </span>,
              ],
              ...(order.notes ? [["Notes", order.notes] as [string, string]] : []),
            ]}
          />

          {order.status !== "cancelled" && (
            <>
              <Separator />
              {/* key: reset the boxes when the saved values change */}
              <BillingFields
                key={`${order.weightKg}-${order.amountCentavos}`}
                order={order}
                disabled={busy}
                onSave={(patch) => change(patch, "Saved")}
              />

              <div className="flex flex-wrap items-center gap-2">
                {order.paid ? (
                  <>
                    <Badge variant="success">
                      Paid{order.amountCentavos != null ? ` ${peso(order.amountCentavos)}` : ""}
                      {order.paymentMethod ? ` · ${PAYMENT_LABEL[order.paymentMethod]}` : ""}
                    </Badge>
                    <Button
                      variant="link"
                      size="sm"
                      className="px-1 underline"
                      disabled={busy}
                      onClick={() => change({ paymentMethod: null })}
                    >
                      Undo
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="warning">Unpaid</Badge>
                    <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      Paid by:
                      {PAYMENT_METHODS.map((method) => (
                        <Button
                          key={method}
                          variant="outline"
                          size="sm"
                          className="text-foreground"
                          disabled={busy}
                          onClick={() => change({ paymentMethod: method }, "Marked paid")}
                        >
                          {method === "bank" ? "Bank" : PAYMENT_LABEL[method]}
                        </Button>
                      ))}
                    </span>
                  </>
                )}
              </div>
            </>
          )}

          {order.status === "ready" && (
            <>
              <ReadyMessage message={readyMessage(order, shop.name)} phone={order.customer.phone} />
              <div className="flex flex-wrap items-center gap-2">
                {order.notifiedAt ? (
                  <>
                    <Badge variant="success">
                      Customer told · {formatDateTime(order.notifiedAt)}
                    </Badge>
                    <Button
                      variant="link"
                      size="sm"
                      className="px-1 underline"
                      disabled={busy}
                      onClick={() => change({ notified: false })}
                    >
                      Undo
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge variant="warning">Customer not told yet</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => change({ notified: true })}
                    >
                      I told the customer
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {next && (
            <Button
              className="w-full"
              disabled={busy}
              onClick={() => change({ status: next.status }, STATUS_LABEL[next.status])}
            >
              {next.label}
            </Button>
          )}

          {(previous || !closed) && (
            <details>
              <summary className="py-1.5 text-muted-foreground">More</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {previous && (
                  <Button
                    variant="outline"
                    className="flex-[1_1_140px]"
                    disabled={busy}
                    onClick={() => change({ status: previous })}
                  >
                    <Undo2 data-icon="inline-start" /> Move back to &quot;{STATUS_LABEL[previous]}
                    &quot;
                  </Button>
                )}
                {!closed && (
                  <Button
                    variant="destructive"
                    className="flex-[1_1_140px]"
                    disabled={busy}
                    onClick={() => change({ status: "cancelled" }, "Order cancelled")}
                  >
                    <Ban data-icon="inline-start" /> Cancel order
                  </Button>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </article>
  );
}

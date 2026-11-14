"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Phone, Save, Store, Truck, Undo2, X } from "lucide-react";
import { useOrderChange, useServices, useTeam } from "@/components/owner/data";
import ReadyMessage from "@/components/owner/ReadyMessage";
import StatusBadge from "@/components/StatusBadge";
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useBackend, useMe, useShop } from "@/lib/backend";
import {
  displayPhone,
  formatDateTime,
  formatDay,
  peso,
  pesosInput,
  ratePerKg,
  readyMessage,
} from "@/lib/format";
import { PAY_STATE_LABEL, balanceCentavos, paidCentavos, payState, totalFor } from "@/lib/money";
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

/** True when the total is simply kilos x rate, i.e. nobody typed a different amount. */
const totalFollowsRate = (order: Order) =>
  order.amountCentavos == null ||
  (order.weightKg != null && order.amountCentavos === totalFor(order.weightKg, order.rateCentavos));

type Change = (patch: OrderPatch, done?: string) => void;

/** C1: kilos and total. The total fills in from kilos x rate until someone types over it. */
function BillingFields({
  order,
  disabled,
  onSave,
}: {
  order: Order;
  disabled: boolean;
  onSave: Change;
}) {
  // Several cards are on screen at once, so the field ids must differ per card.
  const id = useId();
  const [byRate, setByRate] = useState(totalFollowsRate(order));
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BillingForm>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      weightKg: order.weightKg?.toString() ?? "",
      amount: order.amountCentavos != null ? pesosInput(order.amountCentavos) : "",
    },
  });
  const kilos = parseAmount(watch("weightKg"), MAX_KG);
  const rateTotal = kilos != null ? totalFor(kilos, order.rateCentavos) : null;

  const save = handleSubmit(({ weightKg, amount }) => {
    const pesos = parseAmount(amount, MAX_PESOS) ?? null;
    onSave(
      {
        weightKg: parseAmount(weightKg, MAX_KG) ?? null,
        amountCentavos: pesos == null ? null : Math.round(pesos * 100),
      },
      "Saved",
    );
  });

  return (
    <form onSubmit={save} noValidate className="grid gap-2">
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <Field className="gap-1">
          <FieldLabel htmlFor={`${id}-kg`} className="font-normal text-muted-foreground">
            Kilos
          </FieldLabel>
          <Input
            {...register("weightKg", {
              onChange: (e) => {
                if (!byRate) return;
                const kg = parseAmount(e.target.value, MAX_KG);
                setValue("amount", kg != null ? pesosInput(totalFor(kg, order.rateCentavos)) : "");
              },
            })}
            id={`${id}-kg`}
            inputMode="decimal"
            placeholder="0"
            aria-invalid={!!errors.weightKg}
          />
        </Field>
        <Field className="gap-1">
          <FieldLabel htmlFor={`${id}-amount`} className="font-normal text-muted-foreground">
            Total (₱)
          </FieldLabel>
          <Input
            {...register("amount", {
              // Typing a total switches off the automatic one; clearing it switches it back on.
              onChange: (e) => setByRate(e.target.value.trim() === ""),
            })}
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
      <p className="text-sm text-muted-foreground">
        {byRate
          ? `${ratePerKg(order.rateCentavos)}: the total fills in from the kilos.`
          : `Total typed by hand.${rateTotal != null ? ` At ${ratePerKg(order.rateCentavos)} it would be ${peso(rateTotal)}.` : ""}`}
      </p>
      <FieldError>{errors.weightKg?.message ?? errors.amount?.message}</FieldError>
    </form>
  );
}

/** C2 and C3: what has been paid, what is still owed, and recording a payment. */
function Payments({ order }: { order: Order }) {
  const id = useId();
  const backend = useBackend();
  const me = useMe();
  const team = useTeam();
  const { busy, change } = useOrderChange();
  const balance = balanceCentavos(order);
  const paid = paidCentavos(order);
  const state = payState(order);
  const [amount, setAmount] = useState(pesosInput(balance));
  const [collector, setCollector] = useState(me.id);
  const [error, setError] = useState("");

  function record(method: (typeof PAYMENT_METHODS)[number]) {
    const pesos = parseAmount(amount, MAX_PESOS);
    const centavos = pesos == null ? 0 : Math.round(pesos * 100);
    if (centavos <= 0) return setError("Enter the amount paid.");
    if (centavos > balance) return setError(`Only ${peso(balance)} is still owed.`);
    setError("");
    change(
      () => backend.addPayment(order.id, { amountCentavos: centavos, method, collectedById: collector }),
      "Payment recorded",
    );
  }

  return (
    <div className="grid gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={state === "paid" ? "success" : state === "partial" ? "info" : "warning"}>
          {PAY_STATE_LABEL[state]}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {order.amountCentavos == null ? (
            "No total yet. Enter the kilos first."
          ) : (
            <>
              {paid > 0 && <>Paid {peso(paid)} · </>}
              Balance <strong className="text-foreground">{peso(balance)}</strong>
            </>
          )}
        </span>
      </div>

      {order.payments.length > 0 && (
        <ul className="grid gap-1 text-sm">
          {order.payments.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span className="flex-1">
                {peso(p.amountCentavos)} · {PAYMENT_LABEL[p.method]} · {p.collectedByName} ·{" "}
                <span className="text-muted-foreground">{formatDateTime(p.at)}</span>
              </span>
              {/* Staff can undo their own entries; the owner can undo any. */}
              {(me.role === "owner" || p.collectedById === me.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  aria-label={`Remove the ${peso(p.amountCentavos)} payment`}
                  onClick={() =>
                    change(() => backend.removePayment(order.id, p.id), "Payment removed")
                  }
                >
                  <X /> Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {balance > 0 && (
        <div className="grid gap-2 rounded-lg bg-muted/60 p-2.5">
          <div className="grid grid-cols-2 gap-2">
            <Field className="gap-1">
              <FieldLabel htmlFor={`${id}-pay`} className="font-normal text-muted-foreground">
                Amount paid (₱)
              </FieldLabel>
              <Input
                id={`${id}-pay`}
                name="payment"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field className="gap-1">
              <FieldLabel htmlFor={`${id}-by`} className="font-normal text-muted-foreground">
                Collected by
              </FieldLabel>
              <NativeSelect
                id={`${id}-by`}
                name="collectedBy"
                className="w-full"
                value={collector}
                onChange={(e) => setCollector(e.target.value)}
              >
                {team.map((m) => (
                  <NativeSelectOption key={m.id} value={m.id}>
                    {m.id === me.id ? `${m.name} (me)` : m.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            Paid by:
            {PAYMENT_METHODS.map((method) => (
              <Button
                key={method}
                variant="outline"
                size="sm"
                className="text-foreground"
                disabled={busy}
                onClick={() => record(method)}
              >
                {method === "bank" ? "Bank" : PAYMENT_LABEL[method]}
              </Button>
            ))}
          </div>
          <FieldError>{error}</FieldError>
        </div>
      )}
    </div>
  );
}

/** B6: change the service, address and notes. */
function EditDetails({ order, disabled, onSave }: { order: Order; disabled: boolean; onSave: Change }) {
  const id = useId();
  const services = useServices().filter((s) => s.active || s.id === order.serviceId);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      serviceId: String(order.serviceId),
      address: order.address,
      landmark: order.landmark,
      notes: order.notes,
    },
  });

  const save = handleSubmit((values) => {
    const serviceId = Number(values.serviceId);
    const service = services.find((s) => s.id === serviceId);
    const patch: OrderPatch = { ...values, serviceId };
    // A different service has a different rate: redo the total, unless it was typed by hand.
    if (service && serviceId !== order.serviceId && order.weightKg != null && totalFollowsRate(order))
      patch.amountCentavos = totalFor(order.weightKg, service.pricePerKgCentavos);
    onSave(patch, "Details saved");
  });

  return (
    <form onSubmit={save} className="grid gap-3">
      <Field className="gap-1">
        <FieldLabel htmlFor={`${id}-service`}>Service</FieldLabel>
        <NativeSelect {...register("serviceId")} id={`${id}-service`} className="w-full">
          {services.map((s) => (
            <NativeSelectOption key={s.id} value={s.id}>
              {s.name} ({ratePerKg(s.pricePerKgCentavos)})
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>
      <Field className="gap-1">
        <FieldLabel htmlFor={`${id}-address`}>Address</FieldLabel>
        <Textarea {...register("address")} id={`${id}-address`} rows={2} maxLength={200} />
      </Field>
      <Field className="gap-1">
        <FieldLabel htmlFor={`${id}-landmark`}>Landmark</FieldLabel>
        <Input {...register("landmark")} id={`${id}-landmark`} maxLength={120} />
      </Field>
      <Field className="gap-1">
        <FieldLabel htmlFor={`${id}-notes`}>Notes</FieldLabel>
        <Textarea {...register("notes")} id={`${id}-notes`} rows={2} maxLength={300} />
      </Field>
      <Button type="submit" variant="outline" disabled={disabled}>
        <Save data-icon="inline-start" /> Save details
      </Button>
    </form>
  );
}

const noop = () => () => {};
/** This site's address (https://...), known only in the browser; "" while the server renders. */
const useOrigin = () =>
  useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );

export default function OrderCard({ order }: { order: Order }) {
  const backend = useBackend();
  const shop = useShop();
  const { busy, change: run } = useOrderChange();
  const change: Change = (patch, done) => run(() => backend.updateOrder(order.id, patch), done);
  const origin = useOrigin();
  // The customer's private order page, added to the ready message.
  const statusLink = origin ? `${origin}${backend.paths.order(order.token)}` : undefined;

  const next = nextStep(order);
  const previous = PREVIOUS[order.status];
  const closed = order.status === "completed" || order.status === "cancelled";
  const delivery = order.fulfillment === "delivery";

  return (
    <article data-order-number={order.number}>
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="font-bold">
              #{order.number} · {order.customer.name}
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
            <StatusBadge status={order.status} />
          </CardAction>
        </CardHeader>

        <CardContent className="grid gap-3.5">
          <Summary
            rows={[
              order.intake === "pickup"
                ? ["Pickup", `${formatDay(order.pickupDate)}, ${order.pickupWindow}`]
                : ["Received", `Dropped off, ${formatDay(order.pickupDate)}`],
              ...(order.address
                ? [
                    [
                      "Address",
                      order.address + (order.landmark ? ` (${order.landmark})` : ""),
                    ] as [string, string],
                  ]
                : []),
              ["Service", `${order.service} (${ratePerKg(order.rateCentavos)})`],
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
              {/* key: reset the boxes when the saved values (or the service's rate) change */}
              <BillingFields
                key={`${order.weightKg}-${order.amountCentavos}-${order.rateCentavos}`}
                order={order}
                disabled={busy}
                onSave={change}
              />
              {/* key: the amount box starts at whatever is still owed */}
              <Payments key={balanceCentavos(order)} order={order} />
            </>
          )}

          {order.status === "ready" && (
            <>
              <ReadyMessage
                message={readyMessage(order, shop.name, statusLink)}
                phone={order.customer.phone}
              />
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

          <details>
            <summary className="py-1.5 text-muted-foreground">More</summary>
            <div className="mt-2 grid gap-4">
              {(previous || !closed) && (
                <div className="flex flex-wrap gap-2">
                  {previous && (
                    <Button
                      variant="outline"
                      className="flex-[1_1_140px]"
                      disabled={busy}
                      onClick={() => change({ status: previous })}
                    >
                      <Undo2 data-icon="inline-start" /> Move back to &quot;
                      {STATUS_LABEL[previous]}&quot;
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
              )}

              <section>
                <h4 className="mb-2 font-semibold">Edit details</h4>
                <EditDetails
                  key={`${order.serviceId}-${order.address}-${order.landmark}-${order.notes}`}
                  order={order}
                  disabled={busy}
                  onSave={change}
                />
              </section>

              <section>
                <h4 className="mb-1 font-semibold">History</h4>
                <ol className="grid gap-1 text-sm">
                  {order.history.map((e, i) => (
                    <li key={i}>
                      {STATUS_LABEL[e.status]} ·{" "}
                      <span className="text-muted-foreground">
                        {formatDateTime(e.at)} · {e.byName}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </details>
        </CardContent>
      </Card>
    </article>
  );
}

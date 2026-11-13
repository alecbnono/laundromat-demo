"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LuBan, LuPhone, LuSave, LuStore, LuTruck, LuUndo2 } from "react-icons/lu";
import ReadyMessage from "@/components/owner/ReadyMessage";
import { useUpdateOrder } from "@/components/owner/useOrders";
import {
  Button,
  FieldError,
  LinkButton,
  Pill,
  Summary,
  cardClass,
  inputClass,
  type PillTone,
} from "@/components/ui";
import { cn } from "@/lib/cn";
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

const STATUS_TONE: Record<Status, PillTone> = {
  new: "warn",
  picked_up: "info",
  washing: "info",
  ready: "ok",
  completed: "neutral",
  cancelled: "danger",
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

  return (
    <form onSubmit={save} noValidate>
      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <label>
          <span className="mb-1 block text-[0.85rem] text-muted">Kilos</span>
          <input
            {...register("weightKg")}
            inputMode="decimal"
            placeholder="0"
            aria-invalid={!!errors.weightKg}
            className={inputClass}
          />
        </label>
        <label>
          <span className="mb-1 block text-[0.85rem] text-muted">Amount (₱)</span>
          <input
            {...register("amount")}
            inputMode="decimal"
            placeholder="0"
            aria-invalid={!!errors.amount}
            className={inputClass}
          />
        </label>
        <Button type="submit" disabled={disabled}>
          <LuSave aria-hidden /> Save
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
    <article className={cn(cardClass, "grid gap-3.5")} data-order-id={order.id}>
      <div className="flex items-start justify-between gap-2.5">
        <div>
          <h3 className="text-[1.05rem] font-bold">
            #{order.id} · {order.customer.name}
          </h3>
          <a href={`tel:${order.customer.phone}`} className="inline-flex items-center gap-1.5">
            <LuPhone aria-hidden /> {displayPhone(order.customer.phone)}
          </a>
        </div>
        <Pill tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Pill>
      </div>

      <Summary
        rows={[
          ["Pickup", `${formatDay(order.pickupDate)}, ${order.pickupWindow}`],
          ["Address", order.address + (order.landmark ? ` (${order.landmark})` : "")],
          ["Service", order.service],
          [
            "Return",
            <span key="return" className="inline-flex items-center gap-1.5">
              {delivery ? <LuTruck aria-hidden /> : <LuStore aria-hidden />}
              {delivery ? "Deliver" : "Customer collects"}
            </span>,
          ],
          ...(order.notes ? [["Notes", order.notes] as [string, string]] : []),
        ]}
      />

      {order.status !== "cancelled" && (
        <div className="grid gap-2.5 border-t border-line pt-3">
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
                <Pill tone="ok">
                  Paid{order.amountCentavos != null ? ` ${peso(order.amountCentavos)}` : ""}
                  {order.paymentMethod ? ` · ${PAYMENT_LABEL[order.paymentMethod]}` : ""}
                </Pill>
                <LinkButton disabled={busy} onClick={() => change({ paymentMethod: null })}>
                  Undo
                </LinkButton>
              </>
            ) : (
              <>
                <Pill tone="warn">Unpaid</Pill>
                <span className="flex flex-wrap items-center gap-1.5 text-[0.9rem] text-muted">
                  Paid by:
                  {PAYMENT_METHODS.map((method) => (
                    <Button
                      key={method}
                      small
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
        </div>
      )}

      {order.status === "ready" && (
        <>
          <ReadyMessage message={readyMessage(order, shop.name)} phone={order.customer.phone} />
          <div className="flex flex-wrap items-center gap-2">
            {order.notifiedAt ? (
              <>
                <Pill tone="ok">Customer told · {formatDateTime(order.notifiedAt)}</Pill>
                <LinkButton disabled={busy} onClick={() => change({ notified: false })}>
                  Undo
                </LinkButton>
              </>
            ) : (
              <>
                <Pill tone="warn">Customer not told yet</Pill>
                <Button small disabled={busy} onClick={() => change({ notified: true })}>
                  I told the customer
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {next && (
        <Button
          variant="primary"
          className="w-full"
          disabled={busy}
          onClick={() => change({ status: next.status }, STATUS_LABEL[next.status])}
        >
          {next.label}
        </Button>
      )}

      {(previous || !closed) && (
        <details>
          <summary className="py-1.5 text-muted">More</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {previous && (
              <Button
                className="flex-[1_1_140px]"
                disabled={busy}
                onClick={() => change({ status: previous })}
              >
                <LuUndo2 aria-hidden /> Move back to &quot;{STATUS_LABEL[previous]}&quot;
              </Button>
            )}
            {!closed && (
              <Button
                variant="danger"
                className="flex-[1_1_140px]"
                disabled={busy}
                onClick={() => change({ status: "cancelled" }, "Order cancelled")}
              >
                <LuBan aria-hidden /> Cancel order
              </Button>
            )}
          </div>
        </details>
      )}
    </article>
  );
}

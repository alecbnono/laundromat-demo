"use client";

import type { ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOrderChange, useServices } from "@/components/owner/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useBackend, useShop } from "@/lib/backend";
import { manilaDate, ratePerKg } from "@/lib/format";
import { manualOrderSchema, type ManualOrder } from "@/lib/validation";

/** B5: add an order by hand, for walk-ins and orders taken over Messenger or text. */
export default function AddOrderForm({ onDone }: { onDone: () => void }) {
  const backend = useBackend();
  const shop = useShop();
  const services = useServices().filter((s) => s.active);
  const { busy, changeAsync } = useOrderChange();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ManualOrder>({
    resolver: zodResolver(
      manualOrderSchema({
        serviceIds: services.map((s) => s.id),
        pickupWindows: shop.pickupWindows,
        maxDaysAhead: shop.maxDaysAhead,
      }),
    ),
    defaultValues: {
      name: "",
      phone: "",
      intake: "dropoff",
      pickupDate: manilaDate(),
      pickupWindow: "",
      address: "",
      landmark: "",
      serviceId: String(services[0]?.id ?? ""),
      fulfillment: "collect",
      weightKg: "",
      notes: "",
    },
  });
  const [intake, fulfillment] = useWatch({ control, name: ["intake", "fulfillment"] });
  const pickup = intake === "pickup";
  const needsAddress = pickup || fulfillment === "delivery";

  const save = handleSubmit(async (data) => {
    try {
      await changeAsync(() => backend.createManualOrder(data), "Order added");
      onDone();
    } catch (e) {
      // Show the server's per-field messages next to the fields, if it sent any.
      const fields = e instanceof ApiError ? Object.entries(e.fieldErrors) : [];
      for (const [field, messages] of fields)
        setError(field as keyof ManualOrder, { message: messages[0] });
    }
  });

  const id = (name: keyof ManualOrder) => `add-${name}`;
  const field = (name: keyof ManualOrder) => ({
    ...register(name),
    id: id(name),
    "aria-invalid": !!errors[name],
  });
  const row = (name: keyof ManualOrder, label: ReactNode, children: ReactNode) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={id(name)}>{label}</FieldLabel>
      {children}
      <FieldError>{errors[name]?.message}</FieldError>
    </Field>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="font-bold">Add an order</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} noValidate>
          <FieldGroup className="gap-4">
            {row("name", "Customer name", <Input {...field("name")} maxLength={80} />)}
            {row(
              "phone",
              "Mobile number",
              <Input {...field("phone")} type="tel" inputMode="tel" placeholder="0917 123 4567" />,
            )}
            <div className="grid grid-cols-2 items-start gap-3">
              {row(
                "serviceId",
                "Service",
                <NativeSelect {...field("serviceId")} className="w-full">
                  {services.map((s) => (
                    <NativeSelectOption key={s.id} value={s.id}>
                      {s.name} ({ratePerKg(s.pricePerKgCentavos)})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>,
              )}
              {row(
                "weightKg",
                <>
                  Kilos <span className="font-normal text-muted-foreground">(if weighed)</span>
                </>,
                <Input {...field("weightKg")} inputMode="decimal" placeholder="0" />,
              )}
            </div>
            <div className="grid grid-cols-2 items-start gap-3">
              {row(
                "intake",
                "How it comes in",
                <NativeSelect {...field("intake")} className="w-full">
                  <NativeSelectOption value="dropoff">Dropped off at shop</NativeSelectOption>
                  <NativeSelectOption value="pickup">We pick it up</NativeSelectOption>
                </NativeSelect>,
              )}
              {row(
                "fulfillment",
                "How it goes back",
                <NativeSelect {...field("fulfillment")} className="w-full">
                  <NativeSelectOption value="collect">Customer collects</NativeSelectOption>
                  <NativeSelectOption value="delivery">We deliver</NativeSelectOption>
                </NativeSelect>,
              )}
            </div>
            {pickup && (
              <div className="grid grid-cols-2 items-start gap-3">
                {row(
                  "pickupDate",
                  "Pickup date",
                  <Input {...field("pickupDate")} type="date" min={manilaDate()} />,
                )}
                {row(
                  "pickupWindow",
                  "Pickup time",
                  <NativeSelect {...field("pickupWindow")} className="w-full">
                    <NativeSelectOption value="" disabled>
                      Choose
                    </NativeSelectOption>
                    {shop.pickupWindows.map((w) => (
                      <NativeSelectOption key={w}>{w}</NativeSelectOption>
                    ))}
                  </NativeSelect>,
                )}
              </div>
            )}
            {needsAddress && (
              <>
                {row(
                  "address",
                  "Address",
                  <Textarea
                    {...field("address")}
                    rows={2}
                    maxLength={200}
                    placeholder="House no., street, barangay"
                  />,
                )}
                {row(
                  "landmark",
                  <>
                    Landmark <span className="font-normal text-muted-foreground">(optional)</span>
                  </>,
                  <Input {...field("landmark")} maxLength={120} />,
                )}
              </>
            )}
            {row(
              "notes",
              <>
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </>,
              <Textarea {...field("notes")} rows={2} maxLength={300} />,
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save order"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

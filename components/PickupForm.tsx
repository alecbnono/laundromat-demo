"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useBackend } from "@/lib/backend";
import { pickupRequestSchema, type PickupRequest } from "@/lib/validation";

interface Props {
  services: readonly { name: string; price: string }[];
  windows: readonly string[];
  minDate: string;
  maxDate: string;
}

const optional = <span className="font-normal text-muted-foreground">(optional)</span>;

/** One tappable radio choice: the whole bordered row is the label. */
function Choice({ id, value, title, detail }: { id: string; value: string; title: string; detail?: string }) {
  return (
    <FieldLabel htmlFor={id}>
      <Field orientation="horizontal">
        <RadioGroupItem id={id} value={value} className="size-5" />
        <FieldContent>
          <FieldTitle className="text-base">{title}</FieldTitle>
          {detail && <FieldDescription>{detail}</FieldDescription>}
        </FieldContent>
      </Field>
    </FieldLabel>
  );
}

export default function PickupForm({ services, windows, minDate, maxDate }: Props) {
  const router = useRouter();
  const backend = useBackend();
  const queryClient = useQueryClient();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PickupRequest>({
    resolver: zodResolver(pickupRequestSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      landmark: "",
      service: services[0]?.name,
      pickupDate: minDate,
      pickupWindow: "",
      fulfillment: "delivery",
      notes: "",
      website: "",
    },
  });

  const submit = useMutation({
    mutationFn: backend.createOrder,
    onSuccess: ({ token }) => {
      queryClient.invalidateQueries({ queryKey: backend.ordersKey });
      router.push(`${backend.base}/order/${token}?new=1`);
    },
    onError: (e) => {
      // Show the server's per-field messages next to the fields, if it sent any.
      const fields = e instanceof ApiError ? Object.entries(e.fieldErrors) : [];
      for (const [field, messages] of fields)
        setError(field as keyof PickupRequest, { message: messages[0] });
      if (fields.length === 0) setError("root", { message: e.message });
    },
  });
  // Keep the button disabled while the confirmation page loads.
  const busy = submit.isPending || submit.isSuccess;

  /** Props for a text field: registers it and wires up its label and error message. */
  const field = (name: keyof PickupRequest) => ({
    ...register(name),
    id: name,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const err = (name: keyof PickupRequest) => (
    <FieldError id={`${name}-error`}>{errors[name]?.message}</FieldError>
  );
  /** A labelled field with its error message underneath. */
  const row = (name: keyof PickupRequest, label: ReactNode, children: ReactNode) => (
    <Field data-invalid={!!errors[name]}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      {children}
      {err(name)}
    </Field>
  );
  /** A group of radio choices. */
  const choices = (name: "service" | "fulfillment", legend: string, children: ReactNode) => (
    <FieldSet data-invalid={!!errors[name]}>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <RadioGroup
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
          >
            {children}
          </RadioGroup>
        )}
      />
      {err(name)}
    </FieldSet>
  );

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit((data) => submit.mutate(data))} noValidate>
          <FieldGroup>
            <FieldError>{errors.root?.message}</FieldError>

            {row("name", "Your name", <Input {...field("name")} autoComplete="name" maxLength={80} />)}

            {row(
              "phone",
              "Mobile number",
              <>
                <Input
                  {...field("phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0917 123 4567"
                />
                <FieldDescription>We will text you here when your laundry is ready.</FieldDescription>
              </>,
            )}

            {row(
              "address",
              "Pickup address",
              <Textarea
                {...field("address")}
                rows={2}
                autoComplete="street-address"
                maxLength={200}
                placeholder="House no., street, barangay"
              />,
            )}

            {row(
              "landmark",
              <>Landmark {optional}</>,
              <Input
                {...field("landmark")}
                maxLength={120}
                placeholder="e.g. beside the sari-sari store, green gate"
              />,
            )}

            {choices(
              "service",
              "Service",
              services.map((s, i) => (
                <Choice key={s.name} id={`service-${i}`} value={s.name} title={s.name} detail={s.price} />
              )),
            )}

            <div className="grid grid-cols-2 items-start gap-3">
              {row(
                "pickupDate",
                "Pickup date",
                <Input {...field("pickupDate")} type="date" min={minDate} max={maxDate} />,
              )}
              {row(
                "pickupWindow",
                "Pickup time",
                <NativeSelect {...field("pickupWindow")} className="w-full">
                  <NativeSelectOption value="" disabled>
                    Choose
                  </NativeSelectOption>
                  {windows.map((w) => (
                    <NativeSelectOption key={w}>{w}</NativeSelectOption>
                  ))}
                </NativeSelect>,
              )}
            </div>

            {choices(
              "fulfillment",
              "When it is ready",
              <>
                <Choice id="fulfillment-delivery" value="delivery" title="Deliver it back to me" />
                <Choice id="fulfillment-collect" value="collect" title="I will collect it at the shop" />
              </>,
            )}

            {row(
              "notes",
              <>Notes {optional}</>,
              <Textarea
                {...field("notes")}
                rows={2}
                maxLength={300}
                placeholder="e.g. 2 bags, separate the whites, no fabric conditioner"
              />,
            )}

            {/* Spam trap: hidden from people, left empty by real customers. */}
            <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
              <label>
                Website
                <input {...register("website")} tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Request pickup"}
              {!busy && <ArrowRight data-icon="inline-end" />}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

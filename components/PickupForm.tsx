"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LuArrowRight } from "react-icons/lu";
import { Button, FieldError, FieldLabel, cardClass, inputClass } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useBackend } from "@/lib/backend";
import { cn } from "@/lib/cn";
import { pickupRequestSchema, type PickupRequest } from "@/lib/validation";

interface Props {
  services: readonly { name: string; price: string }[];
  windows: readonly string[];
  minDate: string;
  maxDate: string;
}

const choiceClass =
  "mb-2 flex items-center gap-3 rounded-[10px] border border-line p-3 has-checked:border-brand has-checked:bg-brand-soft";
const radioClass = "size-5 flex-none accent-brand";

export default function PickupForm({ services, windows, minDate, maxDate }: Props) {
  const router = useRouter();
  const backend = useBackend();
  const queryClient = useQueryClient();
  const {
    register,
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

  /** Props for a text field: registers it and wires up its error message. */
  const field = (name: keyof PickupRequest) => ({
    ...register(name),
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  const err = (name: keyof PickupRequest) => (
    <FieldError id={`${name}-error`}>{errors[name]?.message}</FieldError>
  );

  return (
    <form
      onSubmit={handleSubmit((data) => submit.mutate(data))}
      className={cn(cardClass, "grid gap-4")}
      noValidate
    >
      <FieldError>{errors.root?.message}</FieldError>

      <label>
        <FieldLabel>Your name</FieldLabel>
        <input {...field("name")} autoComplete="name" maxLength={80} className={inputClass} />
        {err("name")}
      </label>

      <label>
        <FieldLabel>Mobile number</FieldLabel>
        <input
          {...field("phone")}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0917 123 4567"
          className={inputClass}
        />
        <small className="text-[0.85rem] text-muted">
          We will text you here when your laundry is ready.
        </small>
        {err("phone")}
      </label>

      <label>
        <FieldLabel>Pickup address</FieldLabel>
        <textarea
          {...field("address")}
          rows={2}
          autoComplete="street-address"
          maxLength={200}
          placeholder="House no., street, barangay"
          className={inputClass}
        />
        {err("address")}
      </label>

      <label>
        <FieldLabel optional>Landmark</FieldLabel>
        <input
          {...field("landmark")}
          maxLength={120}
          placeholder="e.g. beside the sari-sari store, green gate"
          className={inputClass}
        />
        {err("landmark")}
      </label>

      <fieldset>
        <legend className="mb-1.5 font-semibold">Service</legend>
        {services.map((s) => (
          <label key={s.name} className={choiceClass}>
            <input type="radio" value={s.name} {...register("service")} className={radioClass} />
            <span className="grid">
              <strong className="font-semibold">{s.name}</strong>
              <small className="text-[0.85rem] text-muted">{s.price}</small>
            </span>
          </label>
        ))}
        {err("service")}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <FieldLabel>Pickup date</FieldLabel>
          <input
            {...field("pickupDate")}
            type="date"
            min={minDate}
            max={maxDate}
            className={inputClass}
          />
          {err("pickupDate")}
        </label>
        <label>
          <FieldLabel>Pickup time</FieldLabel>
          <select {...field("pickupWindow")} className={inputClass}>
            <option value="" disabled>
              Choose
            </option>
            {windows.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
          {err("pickupWindow")}
        </label>
      </div>

      <fieldset>
        <legend className="mb-1.5 font-semibold">When it is ready</legend>
        <label className={choiceClass}>
          <input type="radio" value="delivery" {...register("fulfillment")} className={radioClass} />
          <strong className="font-semibold">Deliver it back to me</strong>
        </label>
        <label className={choiceClass}>
          <input type="radio" value="collect" {...register("fulfillment")} className={radioClass} />
          <strong className="font-semibold">I will collect it at the shop</strong>
        </label>
        {err("fulfillment")}
      </fieldset>

      <label>
        <FieldLabel optional>Notes</FieldLabel>
        <textarea
          {...field("notes")}
          rows={2}
          maxLength={300}
          placeholder="e.g. 2 bags, separate the whites, no fabric conditioner"
          className={inputClass}
        />
        {err("notes")}
      </label>

      {/* Spam trap: hidden from people, left empty by real customers. */}
      <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input {...register("website")} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "Sending…" : "Request pickup"}
        {!busy && <LuArrowRight aria-hidden />}
      </Button>
    </form>
  );
}

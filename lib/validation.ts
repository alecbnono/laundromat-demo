// Zod schemas, shared by the forms (React Hook Form) and the API routes.
import { z } from "zod";
import { manilaDate, normalizePhone } from "./format.ts";
import { FULFILLMENTS, INTAKES, PAYMENT_METHODS, STATUSES } from "./types.ts";

/**
 * True for a date that exists on the calendar. "2026-11-31" and "2026-12-00" look like dates
 * and can fall inside the allowed range, but showing them later breaks the order list.
 */
function isRealDate(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** What a shop offers, as far as checking a form goes. */
export interface FormOptions {
  serviceIds: number[];
  pickupWindows: string[];
  maxDaysAhead: number;
}

const name = (missing: string) =>
  z.string().trim().min(1, missing).max(80, "Name is too long.");
const phone = z
  .string()
  .trim()
  .refine((v) => normalizePhone(v) !== null, "Enter a mobile number like 0917 123 4567.");
const landmark = z.string().trim().max(120, "Landmark is too long.");
const notes = z.string().trim().max(300, "Notes are too long (300 characters max).");
// Radio buttons and select boxes hold text, so the service arrives as "12", not 12.
const serviceId = (o: FormOptions) =>
  z.string().refine((v) => o.serviceIds.includes(Number(v)), "Please choose a service.");
const pickupDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a pickup date.")
  .refine(isRealDate, "Please choose a pickup date.");

/** The customer's pickup request form (A2, A3). */
export const pickupRequestSchema = (o: FormOptions) =>
  z.object({
    name: name("Please enter your name."),
    phone,
    address: z
      .string()
      .trim()
      .min(1, "Please enter your pickup address.")
      .max(200, "Address is too long."),
    landmark,
    serviceId: serviceId(o),
    pickupDate: pickupDate.refine(
      (d) => d >= manilaDate() && d <= manilaDate(o.maxDaysAhead),
      `Choose a date within the next ${o.maxDaysAhead} days.`,
    ),
    pickupWindow: z
      .string()
      .refine((v) => o.pickupWindows.includes(v), "Please choose a pickup time."),
    fulfillment: z.enum(FULFILLMENTS, "Please choose how you want your laundry back."),
    notes,
    // Spam trap: hidden from people, so real customers leave it empty. Checked on the server.
    website: z.string().optional(),
  });
export type PickupRequest = z.infer<ReturnType<typeof pickupRequestSchema>>;

/** "7.5" or "1,250" -> number. Empty -> null. Anything else -> undefined (invalid). */
export function parseAmount(raw: string, max: number): number | null | undefined {
  const s = raw.trim().replace(/,/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
}

export const MAX_KG = 1000;
export const MAX_PESOS = 1_000_000;

const kilosText = z
  .string()
  .refine((v) => parseAmount(v, MAX_KG) !== undefined, "Enter kilos as a number.");
const pesosText = z
  .string()
  .refine((v) => parseAmount(v, MAX_PESOS) !== undefined, "Enter the amount as a number.");

/**
 * An order typed in by the shop (B5): a walk-in, or one taken over Messenger or text.
 * A drop-off needs no pickup details; an address is only needed if we travel to it.
 */
export const manualOrderSchema = (o: FormOptions) =>
  z
    .object({
      name: name("Please enter the customer's name."),
      phone,
      intake: z.enum(INTAKES),
      pickupDate: z.string(),
      pickupWindow: z.string(),
      address: z.string().trim().max(200, "Address is too long."),
      landmark,
      serviceId: serviceId(o),
      fulfillment: z.enum(FULFILLMENTS),
      weightKg: kilosText,
      notes,
    })
    .superRefine((v, ctx) => {
      const issue = (path: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [path], message });
      if (v.intake === "pickup") {
        if (!pickupDate.safeParse(v.pickupDate).success || v.pickupDate < manilaDate())
          issue("pickupDate", "Please choose a pickup date.");
        if (!o.pickupWindows.includes(v.pickupWindow))
          issue("pickupWindow", "Please choose a pickup time.");
      }
      if ((v.intake === "pickup" || v.fulfillment === "delivery") && !v.address)
        issue("address", "Please enter the address.");
    });
export type ManualOrder = z.infer<ReturnType<typeof manualOrderSchema>>;

/** The kilos/total boxes on an order card (text inputs, so strings). */
export const billingFormSchema = z.object({ weightKg: kilosText, amount: pesosText });
export type BillingForm = z.infer<typeof billingFormSchema>;

const centavos = z
  .number()
  .int()
  .min(0)
  .max(MAX_PESOS * 100);

/** What the shop may change on an order (PATCH /api/orders/:id). */
export const orderPatchSchema = z
  .object({
    status: z.enum(STATUSES),
    weightKg: z.number().min(0).max(MAX_KG).nullable(),
    amountCentavos: centavos.nullable(),
    serviceId: z.number().int().positive(),
    address: z.string().trim().max(200),
    landmark: z.string().trim().max(120),
    notes: z.string().trim().max(300),
    notified: z.boolean(),
  })
  .partial()
  .refine((p) => Object.keys(p).length > 0, "Nothing to change.");

/** Recording a payment (C2). */
export const paymentSchema = z.object({
  amountCentavos: centavos.min(1, "Enter the amount paid."),
  method: z.enum(PAYMENT_METHODS),
  collectedById: z.string().min(1).optional(),
});

/** A service and its price per kilo (C1). */
export const serviceSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1, "Enter the service name.").max(60, "Name is too long."),
  pricePerKgCentavos: centavos.max(100_000_00, "That price looks too high."),
  active: z.boolean(),
});

/** A new staff login (D2). */
export const staffSchema = z.object({
  name: z.string().trim().min(1, "Enter their name.").max(60, "Name is too long."),
  email: z.email("Enter an email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});
export type StaffForm = z.infer<typeof staffSchema>;

export const loginSchema = z.object({
  email: z.email("Enter your email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginForm = z.infer<typeof loginSchema>;

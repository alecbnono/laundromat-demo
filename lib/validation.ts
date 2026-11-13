// Zod schemas, shared by the forms (React Hook Form) and the API routes.
import { z } from "zod";
import { manilaDate, normalizePhone } from "./format.ts";
import { shop } from "./shop.ts";
import { FULFILLMENTS, PAYMENT_METHODS, STATUSES } from "./types.ts";

const services: readonly string[] = shop.services.map((s) => s.name);
const windows: readonly string[] = shop.pickupWindows;

/**
 * True for a date that exists on the calendar. "2026-11-31" and "2026-12-00" look like dates
 * and can fall inside the allowed range, but showing them later breaks the order list.
 */
function isRealDate(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** The customer's pickup request form. */
export const pickupRequestSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(80, "Name is too long."),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizePhone(v) !== null, "Enter a mobile number like 0917 123 4567."),
  address: z
    .string()
    .trim()
    .min(1, "Please enter your pickup address.")
    .max(200, "Address is too long."),
  landmark: z.string().trim().max(120, "Landmark is too long."),
  service: z.string().refine((v) => services.includes(v), "Please choose a service."),
  pickupDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a pickup date.")
    .refine(isRealDate, "Please choose a pickup date.")
    .refine(
      (d) => d >= manilaDate() && d <= manilaDate(shop.maxDaysAhead),
      `Choose a date within the next ${shop.maxDaysAhead} days.`,
    ),
  pickupWindow: z.string().refine((v) => windows.includes(v), "Please choose a pickup time."),
  fulfillment: z.enum(FULFILLMENTS, "Please choose how you want your laundry back."),
  notes: z.string().trim().max(300, "Notes are too long (300 characters max)."),
  // Spam trap: hidden from people, so real customers leave it empty. Checked on the server.
  website: z.string().optional(),
});
export type PickupRequest = z.infer<typeof pickupRequestSchema>;

/** "7.5" or "1,250" -> number. Empty -> null. Anything else -> undefined (invalid). */
export function parseAmount(raw: string, max: number): number | null | undefined {
  const s = raw.trim().replace(/,/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= max ? n : undefined;
}

export const MAX_KG = 1000;
export const MAX_PESOS = 1_000_000;

/** The kilos/amount boxes on an order card (text inputs, so strings). */
export const billingFormSchema = z.object({
  weightKg: z
    .string()
    .refine((v) => parseAmount(v, MAX_KG) !== undefined, "Enter kilos as a number."),
  amount: z
    .string()
    .refine((v) => parseAmount(v, MAX_PESOS) !== undefined, "Enter the amount as a number."),
});
export type BillingForm = z.infer<typeof billingFormSchema>;

/** What the owner may change on an order (PATCH /api/orders/:id). */
export const orderPatchSchema = z
  .object({
    status: z.enum(STATUSES),
    weightKg: z.number().min(0).max(MAX_KG).nullable(),
    amountCentavos: z
      .number()
      .int()
      .min(0)
      .max(MAX_PESOS * 100)
      .nullable(),
    paymentMethod: z.enum(PAYMENT_METHODS).nullable(), // null = not paid
    notified: z.boolean(),
  })
  .partial()
  .refine((p) => Object.keys(p).length > 0, "Nothing to change.");

export const loginSchema = z.object({
  email: z.email("Enter your email address."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginForm = z.infer<typeof loginSchema>;

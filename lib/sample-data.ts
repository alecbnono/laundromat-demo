// SAMPLE shop, team, prices and orders. Used by `npm run seed` and by the /demo page.
// Nothing here is a real shop's data. Phone numbers use the unassigned 0900 prefix so a
// demo SMS can't reach a real person.
import { manilaDate } from "./format.ts";
import { totalFor } from "./money.ts";
import type { Fulfillment, Intake, PaymentMethod, Shop, Status } from "./types.ts";

export const SAMPLE_SHOP: Omit<Shop, "id"> = {
  slug: "sampaloc-laundry-house",
  name: "Sampaloc Laundry House",
  tagline: "Pickup and delivery around Sampaloc, Manila",
  logo: "/logo.svg",
  phone: "+639000000000",
  hours: "Open daily, 7 AM to 8 PM",
  pickupWindows: ["8 to 10 AM", "10 AM to 12 PM", "1 to 3 PM", "3 to 5 PM", "5 to 7 PM"],
  maxDaysAhead: 14,
};

export const SAMPLE_SERVICES = [
  { name: "Wash, dry and fold", pesosPerKg: 35 },
  { name: "Wash, dry and iron", pesosPerKg: 60 },
  { name: "Comforters and bulky items", pesosPerKg: 80 },
] as const;

/** Demo logins made by `npm run seed` (never in production). */
export const SAMPLE_TEAM = [
  { key: "owner", role: "owner", name: "Rosa Dizon", email: "owner@example.com", password: "laundry1234" },
  { key: "staff", role: "staff", name: "Benjo Cruz", email: "staff@example.com", password: "laundry1234" },
] as const;
export type SamplePerson = (typeof SAMPLE_TEAM)[number]["key"];

export interface SampleOrder {
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  /** Index into SAMPLE_SERVICES. */
  service: 0 | 1 | 2;
  intake?: Intake;
  window: string;
  fulfillment: Fulfillment;
  notes?: string;
  /**
   * The day each status was reached, relative to today (0 = today, -1 = yesterday), in the
   * order Requested, Picked up, Washing, Ready, Delivered. Shorter = not that far yet.
   */
  days: number[];
  cancelled?: boolean;
  kg?: number;
  /** A hand-typed total instead of kilos x rate. */
  pesos?: number;
  payments?: { pesos?: number; method: PaymentMethod; by: SamplePerson; day: number }[];
  notified?: boolean;
}

// prettier-ignore
export const SAMPLE_ORDERS: SampleOrder[] = [
  { name: "Liza Mendoza", phone: "+639000000101", address: "1284 Dapitan St, Brgy. 470", landmark: "across the carinderia", service: 0, window: "8 to 10 AM", fulfillment: "delivery", days: [-3, -3, -3, -2, -2], kg: 7.5, payments: [{ method: "gcash", by: "owner", day: -2 }], notified: true },
  { name: "Ramon Bautista", phone: "+639000000102", address: "Unit 3B, 912 P. Noval St", landmark: "blue gate, 2nd floor", service: 1, window: "1 to 3 PM", fulfillment: "collect", notes: "Office polos, please hang.", days: [-3, -3, -2, -2, -1], kg: 6, notified: true },
  { name: "Nena Ocampo", phone: "+639000000109", address: "", service: 0, intake: "dropoff", window: "", fulfillment: "collect", days: [-2, -2, -2, -1, -1], kg: 5, payments: [{ method: "cash", by: "owner", day: -1 }], notified: true },
  { name: "Grace Villanueva", phone: "+639000000103", address: "56 Maceda St, Brgy. 512", service: 0, window: "10 AM to 12 PM", fulfillment: "delivery", notes: "2 bags. Separate the whites.", days: [-1, -1, -1, 0, 0], kg: 14, payments: [{ pesos: 300, method: "cash", by: "staff", day: 0 }], notified: true },
  { name: "Jun Pascual", phone: "+639000000104", address: "2210 España Blvd", landmark: "dorm beside the print shop, ask the guard", service: 0, window: "5 to 7 PM", fulfillment: "collect", days: [-1, -1, 0, 0, 0], kg: 8, payments: [{ method: "gcash", by: "owner", day: 0 }], notified: true },
  { name: "Tess Robles", phone: "+639000000110", address: "77 Algeciras St", service: 1, window: "8 to 10 AM", fulfillment: "delivery", days: [-1, -1, -1, 0, 0], kg: 4.5, payments: [{ method: "cash", by: "staff", day: 0 }], notified: true },
  { name: "Aileen Soriano", phone: "+639000000105", address: "731 Lacson Ave", landmark: "green gate", service: 2, window: "8 to 10 AM", fulfillment: "delivery", notes: "2 comforters, 1 blanket.", days: [-1, 0, 0, 0], kg: 7.5 },
  { name: "Dindo Lim", phone: "+639000000111", address: "9 Sisa St", service: 0, window: "3 to 5 PM", fulfillment: "delivery", days: [-1], cancelled: true },
  { name: "Carlo Reyes", phone: "+639000000106", address: "418 Earnshaw St", service: 1, window: "10 AM to 12 PM", fulfillment: "delivery", days: [0, 0, 0], kg: 6.5, pesos: 400, payments: [{ pesos: 200, method: "gcash", by: "owner", day: 0 }] },
  { name: "Marites Dela Cruz", phone: "+639000000107", address: "88 Blumentritt Rd, Brgy. 520", landmark: "beside the sari-sari store", service: 0, window: "3 to 5 PM", fulfillment: "delivery", notes: "No fabric conditioner please.", days: [0, 0] },
  { name: "Paolo Garcia", phone: "+639000000108", address: "1502 Laon Laan Rd", service: 0, window: "8 to 10 AM", fulfillment: "collect", days: [0] },
];

const STEPS: Status[] = ["new", "picked_up", "washing", "ready", "completed"];
const STEP_HOURS = [8, 10, 13, 15, 17]; // Manila time of day for each step

/**
 * Turns a sample into dated events: when each status was reached and when it was paid.
 * Times that would be in the future are pulled back to just before `nowMs`.
 */
export function sampleTimeline(sample: SampleOrder, sampleIndex: number, nowMs = Date.now()) {
  const at = (day: number, hour: number, minute: number) => {
    const t = new Date(`${manilaDate(day)}T${String(hour).padStart(2, "0")}:00:00+08:00`).getTime();
    return new Date(Math.min(t + minute * 60_000, nowMs - (60 - minute) * 1000)).toISOString();
  };
  const statuses = sample.days.map((day, i) => ({
    status: STEPS[i],
    at: at(day, STEP_HOURS[i], sampleIndex),
    by: (i === 0 ? "customer" : i % 2 ? "staff" : "owner") as "customer" | SamplePerson,
  }));
  // A drop-off is typed in by the shop when the customer brings it, so it was never
  // "Requested": its history starts at the shop.
  if (sample.intake === "dropoff") statuses.shift();
  if (sample.cancelled) {
    const last = sample.days[sample.days.length - 1];
    statuses.push({ status: "cancelled", at: at(last, 18, sampleIndex), by: "owner" });
  }
  const ratePesos = SAMPLE_SERVICES[sample.service].pesosPerKg;
  const totalCentavos =
    sample.pesos != null
      ? sample.pesos * 100
      : sample.kg != null
        ? totalFor(sample.kg, ratePesos * 100)
        : null;
  const payments = (sample.payments ?? []).map((p) => ({
    amountCentavos: p.pesos != null ? p.pesos * 100 : (totalCentavos ?? 0),
    method: p.method,
    by: p.by,
    at: at(p.day, 17, 30 + sampleIndex),
  }));
  const reached = (status: Status) => statuses.find((s) => s.status === status)?.at;
  return {
    statuses,
    payments,
    totalCentavos,
    createdAt: statuses[0].at,
    pickupDate: manilaDate(sample.days[0]),
    notifiedAt: sample.notified ? (reached("ready") ?? null) : null,
  };
}

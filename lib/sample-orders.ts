// SAMPLE orders, used by `npm run seed` and by the /demo pages.
// Phone numbers use the unassigned 0900 prefix so a demo SMS can't reach a real person.
import type { Fulfillment, PaymentMethod, Status } from "./types.ts";

export interface SampleOrder {
  name: string;
  phone: string;
  address: string;
  landmark?: string;
  service: string;
  day: number; // pickup date, relative to today
  window: string;
  fulfillment: Fulfillment;
  notes?: string;
  status: Status;
  kg?: number;
  pesos?: number;
  paid?: PaymentMethod;
  notified?: boolean;
}

const FOLD = "Wash, dry and fold";
const IRON = "Wash, dry and iron";
const BULKY = "Comforters and bulky items";

export const samples: SampleOrder[] = [
  { name: "Liza Mendoza", phone: "+639000000101", address: "1284 Dapitan St, Brgy. 470", landmark: "across the carinderia", service: FOLD, day: -3, window: "8 to 10 AM", fulfillment: "delivery", status: "completed", kg: 7.5, pesos: 180, paid: "gcash", notified: true },
  { name: "Ramon Bautista", phone: "+639000000102", address: "Unit 3B, 912 P. Noval St", landmark: "blue gate, 2nd floor", service: IRON, day: -2, window: "1 to 3 PM", fulfillment: "collect", notes: "Office polos, please hang.", status: "completed", kg: 6, pesos: 280, paid: "cash", notified: true },
  { name: "Grace Villanueva", phone: "+639000000103", address: "56 Maceda St, Brgy. 512", service: FOLD, day: -1, window: "10 AM to 12 PM", fulfillment: "delivery", notes: "2 bags. Separate the whites.", status: "ready", kg: 14, pesos: 360 },
  { name: "Jun Pascual", phone: "+639000000104", address: "2210 España Blvd", landmark: "dorm beside the print shop, ask the guard", service: FOLD, day: -1, window: "5 to 7 PM", fulfillment: "collect", status: "ready", kg: 8, pesos: 180, paid: "gcash", notified: true },
  { name: "Aileen Soriano", phone: "+639000000105", address: "731 Lacson Ave", landmark: "green gate", service: BULKY, day: 0, window: "8 to 10 AM", fulfillment: "delivery", notes: "2 comforters, 1 blanket.", status: "washing", pesos: 600 },
  { name: "Carlo Reyes", phone: "+639000000106", address: "418 Earnshaw St", service: IRON, day: 0, window: "10 AM to 12 PM", fulfillment: "delivery", status: "picked_up" },
  { name: "Marites Dela Cruz", phone: "+639000000107", address: "88 Blumentritt Rd, Brgy. 520", landmark: "beside the sari-sari store", service: FOLD, day: 0, window: "3 to 5 PM", fulfillment: "delivery", notes: "No fabric conditioner please.", status: "new" },
  { name: "Paolo Garcia", phone: "+639000000108", address: "1502 Laon Laan Rd", service: FOLD, day: 1, window: "8 to 10 AM", fulfillment: "collect", status: "new" },
];

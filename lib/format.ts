// Pure helpers, safe on both server and client.
import { balanceCentavos } from "./money.ts";
import type { Order } from "./types.ts";

const TZ = "Asia/Manila";

/** Accepts 09XXXXXXXXX, 9XXXXXXXXX, 639XXXXXXXXX, +639XXXXXXXXX. Returns +639XXXXXXXXX or null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  const m = digits.match(/^(?:63|0)?(9\d{9})$/);
  return m ? `+63${m[1]}` : null;
}

/** +639171234567 -> 0917 123 4567 */
export function displayPhone(phone: string): string {
  const m = phone.match(/^\+63(\d{3})(\d{3})(\d{4})$/);
  return m ? `0${m[1]} ${m[2]} ${m[3]}` : phone;
}

export function peso(centavos: number): string {
  const value = centavos / 100;
  return `₱${value.toLocaleString("en-PH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Today's date in Manila as YYYY-MM-DD, optionally offset by days. */
export function manilaDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** The Manila calendar day (YYYY-MM-DD) that a moment in time falls on. */
export function manilaDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
}

/** 2026-11-13 -> "Fri, Nov 13" (or "Today" / "Tomorrow") */
export function formatDay(date: string): string {
  if (date === manilaDate()) return "Today";
  if (date === manilaDate(1)) return "Tomorrow";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00+08:00`));
}

/** Whole pesos as typed into a box: 26250 -> "262.5", 18000 -> "180". */
export function pesosInput(centavos: number): string {
  return String(centavos / 100);
}

/** "₱35/kg" */
export function ratePerKg(centavos: number): string {
  return `${peso(centavos)}/kg`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * The "your laundry is ready" text the shop copies or sends from its own phone (B7):
 * customer name, shop name and the amount due.
 * `statusLink` is the customer's private order page; it is added when given.
 */
export function readyMessage(order: Order, shopName: string, statusLink?: string): string {
  const firstName = order.customer.name.trim().split(/\s+/)[0];
  const parts = [
    `Hi ${firstName}! Your laundry from ${shopName} is ready (order #${order.number}).`,
  ];
  if (order.amountCentavos != null) {
    const due = balanceCentavos(order);
    parts.push(
      due === 0
        ? `Total: ${peso(order.amountCentavos)} (paid).`
        : due === order.amountCentavos
          ? `Total: ${peso(order.amountCentavos)}.`
          : `Total: ${peso(order.amountCentavos)}. Still to pay: ${peso(due)}.`,
    );
  }
  parts.push(
    order.fulfillment === "delivery"
      ? "We will deliver it to your address. Please reply if you want a different time."
      : "You can collect it at the shop anytime during opening hours.",
  );
  if (statusLink) parts.push(`Your order: ${statusLink}`);
  parts.push("Thank you!");
  return parts.join(" ");
}

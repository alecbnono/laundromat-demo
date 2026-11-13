// Pure helpers, safe on both server and client.
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

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** The "your laundry is ready" text the owner copies or sends by SMS. */
export function readyMessage(order: Order, shopName: string): string {
  const firstName = order.customer.name.trim().split(/\s+/)[0];
  const parts = [
    `Hi ${firstName}! Your laundry from ${shopName} is ready (order #${order.id}).`,
  ];
  if (order.amountCentavos != null) {
    parts.push(
      order.paid
        ? `Total: ${peso(order.amountCentavos)} (paid).`
        : `Total: ${peso(order.amountCentavos)}.`,
    );
  }
  parts.push(
    order.fulfillment === "delivery"
      ? "We will deliver it to your address. Please reply if you want a different time."
      : "You can collect it at the shop anytime during opening hours.",
  );
  parts.push("Thank you!");
  return parts.join(" ");
}

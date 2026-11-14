import { describe, expect, it } from "vitest";
import {
  displayPhone,
  formatDay,
  manilaDate,
  manilaDay,
  normalizePhone,
  peso,
  readyMessage,
} from "./format";
import type { Order } from "./types";

describe("normalizePhone", () => {
  it.each(["09171234567", "0917 123 4567", "9171234567", "639171234567", "+63 917-123-4567"])(
    "accepts %s",
    (raw) => expect(normalizePhone(raw)).toBe("+639171234567"),
  );

  it.each(["", "12345", "0817123456", "091712345678", "landline 8123 4567"])(
    "rejects %j",
    (raw) => expect(normalizePhone(raw)).toBeNull(),
  );
});

describe("displayPhone", () => {
  it("shows the local format", () => expect(displayPhone("+639171234567")).toBe("0917 123 4567"));
  it("leaves unknown formats alone", () => expect(displayPhone("12345")).toBe("12345"));
});

describe("peso", () => {
  it("drops centavos on whole amounts", () => expect(peso(18000)).toBe("₱180"));
  it("keeps centavos otherwise", () => expect(peso(18050)).toBe("₱180.50"));
  it("groups thousands", () => expect(peso(125000)).toBe("₱1,250"));
});

describe("formatDay", () => {
  it("names today and tomorrow", () => {
    expect(formatDay(manilaDate())).toBe("Today");
    expect(formatDay(manilaDate(1))).toBe("Tomorrow");
  });
  it("formats other dates", () => expect(formatDay("2020-01-15")).toBe("Wed, Jan 15"));
});

describe("readyMessage (B7)", () => {
  const order = {
    number: 12,
    status: "ready",
    fulfillment: "delivery",
    amountCentavos: 36000,
    payments: [],
    customer: { id: 1, name: "Grace Villanueva", phone: "+639000000103" },
  } as unknown as Order;
  const paid = (amountCentavos: number) => ({ ...order, payments: [{ amountCentavos }] }) as Order;

  it("uses the first name, order number and total", () => {
    const text = readyMessage(order, "Sampaloc Laundry House");
    expect(text).toContain("Hi Grace!");
    expect(text).toContain("from Sampaloc Laundry House");
    expect(text).toContain("order #12");
    expect(text).toContain("Total: ₱360.");
    expect(text).toContain("deliver it to your address");
  });

  it("says when it is already paid and for collection", () => {
    const text = readyMessage({ ...paid(36000), fulfillment: "collect" }, "Shop");
    expect(text).toContain("Total: ₱360 (paid).");
    expect(text).toContain("collect it at the shop");
  });

  it("gives the amount still due after a part payment", () => {
    expect(readyMessage(paid(10000), "Shop")).toContain("Total: ₱360. Still to pay: ₱260.");
  });

  it("adds the order link when given one", () => {
    const link = "https://laundry.example.com/order/abc123XYZ";
    expect(readyMessage(order, "Shop", link)).toContain(`Your order: ${link} Thank you!`);
    expect(readyMessage(order, "Shop")).not.toContain("Your order:");
  });

  it("leaves the total out when no amount is set", () => {
    expect(readyMessage({ ...order, amountCentavos: null }, "Shop")).not.toContain("Total");
  });
});

describe("manilaDay", () => {
  it("uses the Manila calendar day, not the UTC one", () => {
    // 11:30 PM on the 13th in UTC is already 7:30 AM on the 14th in Manila.
    expect(manilaDay("2026-11-13T23:30:00Z")).toBe("2026-11-14");
    expect(manilaDay("2026-11-13T15:59:00Z")).toBe("2026-11-13");
  });
});

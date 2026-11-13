import { describe, expect, it, vi } from "vitest";
import { manilaDate } from "./format";
import { shop } from "./shop";
import {
  billingFormSchema,
  orderPatchSchema,
  parseAmount,
  pickupRequestSchema,
} from "./validation";

const valid = {
  name: "  Liza Mendoza ",
  phone: "0917 123 4567",
  address: "1284 Dapitan St",
  landmark: "",
  service: shop.services[0].name,
  pickupDate: manilaDate(),
  pickupWindow: shop.pickupWindows[0],
  fulfillment: "delivery",
  notes: "",
};

/** Field names that failed validation. */
function failed(input: unknown): string[] {
  const result = pickupRequestSchema.safeParse(input);
  return result.success ? [] : [...new Set(result.error.issues.map((i) => String(i.path[0])))];
}

describe("pickupRequestSchema", () => {
  it("accepts a complete request and trims text", () => {
    const result = pickupRequestSchema.parse(valid);
    expect(result.name).toBe("Liza Mendoza");
  });

  it("requires name, phone, address and pickup time", () => {
    expect(failed({ ...valid, name: " ", phone: "123", address: "", pickupWindow: "" })).toEqual([
      "name",
      "phone",
      "address",
      "pickupWindow",
    ]);
  });

  it("only allows the shop's services and pickup times", () => {
    expect(failed({ ...valid, service: "Dry cleaning" })).toEqual(["service"]);
    expect(failed({ ...valid, pickupWindow: "Midnight" })).toEqual(["pickupWindow"]);
  });

  it("only allows dates from today up to the booking limit", () => {
    expect(failed({ ...valid, pickupDate: manilaDate(-1) })).toEqual(["pickupDate"]);
    expect(failed({ ...valid, pickupDate: manilaDate(shop.maxDaysAhead) })).toEqual([]);
    expect(failed({ ...valid, pickupDate: manilaDate(shop.maxDaysAhead + 1) })).toEqual([
      "pickupDate",
    ]);
    expect(failed({ ...valid, pickupDate: "tomorrow" })).toEqual(["pickupDate"]);
  });

  it("rejects dates that are not on the calendar, even inside the allowed range", () => {
    vi.useFakeTimers({ now: new Date("2026-11-25T04:00:00Z") }); // noon in Manila
    try {
      expect(failed({ ...valid, pickupDate: "2026-11-30" })).toEqual([]);
      expect(failed({ ...valid, pickupDate: "2026-11-31" })).toEqual(["pickupDate"]);
      expect(failed({ ...valid, pickupDate: "2026-12-00" })).toEqual(["pickupDate"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("limits text lengths", () => {
    expect(failed({ ...valid, notes: "x".repeat(301) })).toEqual(["notes"]);
  });
});

describe("parseAmount", () => {
  it("reads numbers, with or without commas", () => {
    expect(parseAmount("7.5", 1000)).toBe(7.5);
    expect(parseAmount(" 1,250 ", 10_000)).toBe(1250);
  });
  it("treats empty as cleared", () => expect(parseAmount("  ", 1000)).toBeNull());
  it("rejects text, negatives and too-large values", () => {
    expect(parseAmount("abc", 1000)).toBeUndefined();
    expect(parseAmount("-1", 1000)).toBeUndefined();
    expect(parseAmount("1001", 1000)).toBeUndefined();
  });
});

describe("billingFormSchema", () => {
  it("accepts numbers and blanks", () => {
    expect(billingFormSchema.safeParse({ weightKg: "7.5", amount: "" }).success).toBe(true);
  });
  it("rejects text", () => {
    expect(billingFormSchema.safeParse({ weightKg: "seven", amount: "180" }).success).toBe(false);
  });
});

describe("orderPatchSchema", () => {
  it("accepts single-field changes", () => {
    expect(orderPatchSchema.safeParse({ status: "ready" }).success).toBe(true);
    expect(orderPatchSchema.safeParse({ paymentMethod: null }).success).toBe(true);
  });
  it("rejects empty and invalid changes", () => {
    expect(orderPatchSchema.safeParse({}).success).toBe(false);
    expect(orderPatchSchema.safeParse({ status: "lost" }).success).toBe(false);
    expect(orderPatchSchema.safeParse({ amountCentavos: 10.5 }).success).toBe(false);
  });
});

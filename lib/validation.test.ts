import { describe, expect, it, vi } from "vitest";
import { manilaDate } from "./format";
import {
  billingFormSchema,
  manualOrderSchema,
  orderPatchSchema,
  parseAmount,
  paymentSchema,
  pickupRequestSchema,
  serviceSchema,
  staffSchema,
} from "./validation";

/** What a shop offers: two services, two pickup times, bookings up to 14 days ahead. */
const shop = { serviceIds: [1, 2], pickupWindows: ["8 to 10 AM", "1 to 3 PM"], maxDaysAhead: 14 };

const valid = {
  name: "  Liza Mendoza ",
  phone: "0917 123 4567",
  address: "1284 Dapitan St",
  landmark: "",
  serviceId: "1",
  pickupDate: manilaDate(),
  pickupWindow: shop.pickupWindows[0],
  fulfillment: "delivery",
  notes: "",
};

/** Field names that failed validation. */
function failed(input: unknown): string[] {
  const result = pickupRequestSchema(shop).safeParse(input);
  return result.success ? [] : [...new Set(result.error.issues.map((i) => String(i.path[0])))];
}

describe("pickupRequestSchema", () => {
  it("accepts a complete request and trims text", () => {
    const result = pickupRequestSchema(shop).parse(valid);
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
    expect(failed({ ...valid, serviceId: "3" })).toEqual(["serviceId"]);
    expect(failed({ ...valid, serviceId: "Dry cleaning" })).toEqual(["serviceId"]);
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
    expect(orderPatchSchema.safeParse({ amountCentavos: null }).success).toBe(true);
    expect(orderPatchSchema.safeParse({ serviceId: 2, notes: "Hang the polos" }).success).toBe(true);
  });
  it("rejects empty and invalid changes", () => {
    expect(orderPatchSchema.safeParse({}).success).toBe(false);
    expect(orderPatchSchema.safeParse({ status: "lost" }).success).toBe(false);
    expect(orderPatchSchema.safeParse({ amountCentavos: 10.5 }).success).toBe(false);
  });
});

describe("manualOrderSchema (B5)", () => {
  const walkIn = {
    name: "Nena Ocampo",
    phone: "09000000109",
    intake: "dropoff",
    pickupDate: "",
    pickupWindow: "",
    address: "",
    landmark: "",
    serviceId: "2",
    fulfillment: "collect",
    weightKg: "5",
    notes: "",
  };
  const failedManual = (input: unknown): string[] => {
    const result = manualOrderSchema(shop).safeParse(input);
    return result.success ? [] : [...new Set(result.error.issues.map((i) => String(i.path[0])))];
  };

  it("accepts a walk-in with no address or pickup details", () => {
    expect(failedManual(walkIn)).toEqual([]);
    expect(failedManual({ ...walkIn, weightKg: "" })).toEqual([]);
  });

  it("needs an address when we deliver it back", () => {
    expect(failedManual({ ...walkIn, fulfillment: "delivery" })).toEqual(["address"]);
  });

  it("needs a date, time and address when we pick it up", () => {
    expect(failedManual({ ...walkIn, intake: "pickup" })).toEqual([
      "pickupDate",
      "pickupWindow",
      "address",
    ]);
    expect(
      failedManual({
        ...walkIn,
        intake: "pickup",
        pickupDate: manilaDate(1),
        pickupWindow: "1 to 3 PM",
        address: "9 Sisa St",
      }),
    ).toEqual([]);
  });

  it("still checks the name, phone, service and kilos", () => {
    expect(
      failedManual({ ...walkIn, name: "", phone: "123", serviceId: "9", weightKg: "five" }),
    ).toEqual(["name", "phone", "serviceId", "weightKg"]);
  });
});

describe("paymentSchema (C2)", () => {
  it("needs a positive whole number of centavos and a known method", () => {
    expect(paymentSchema.safeParse({ amountCentavos: 18000, method: "gcash" }).success).toBe(true);
    expect(paymentSchema.safeParse({ amountCentavos: 0, method: "cash" }).success).toBe(false);
    expect(paymentSchema.safeParse({ amountCentavos: 10.5, method: "cash" }).success).toBe(false);
    expect(paymentSchema.safeParse({ amountCentavos: 100, method: "card" }).success).toBe(false);
  });
});

describe("serviceSchema (C1) and staffSchema (D2)", () => {
  it("needs a service name and a price", () => {
    const service = { name: "Wash and fold", pricePerKgCentavos: 3500, active: true };
    expect(serviceSchema.safeParse(service).success).toBe(true);
    expect(serviceSchema.safeParse({ ...service, name: " " }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...service, pricePerKgCentavos: -1 }).success).toBe(false);
  });

  it("needs a name, an email and a password of 8 or more characters", () => {
    const staff = { name: "Benjo", email: "benjo@example.com", password: "12345678" };
    expect(staffSchema.safeParse(staff).success).toBe(true);
    expect(staffSchema.safeParse({ ...staff, password: "1234567" }).success).toBe(false);
    expect(staffSchema.safeParse({ ...staff, email: "benjo" }).success).toBe(false);
  });
});

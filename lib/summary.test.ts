import { describe, expect, it } from "vitest";
import { dailySummary, matchesSearch, newestFirst, unpaidBalance, unpaidDelivered } from "./summary";
import type { Order, PaymentMethod, Status } from "./types";

// Times are written in Manila time (+08:00).
const at = (day: string, hour: number) => `2026-11-${day}T${String(hour).padStart(2, "0")}:00:00+08:00`;
let nextId = 1;

function order(o: {
  name?: string;
  phone?: string;
  created: string;
  status?: Status;
  total?: number | null;
  delivered?: string;
  paid?: [amount: number, method: PaymentMethod, by: string, at: string][];
}): Order {
  const id = nextId++;
  const status = o.status ?? (o.delivered ? "completed" : "new");
  return {
    id,
    number: id,
    status,
    createdAt: o.created,
    updatedAt: o.delivered ?? o.created,
    amountCentavos: o.total === undefined ? 10000 : o.total,
    customer: { id, name: o.name ?? `Customer ${id}`, phone: o.phone ?? "+639000000100" },
    payments: (o.paid ?? []).map(([amountCentavos, method, by, paidAt], i) => ({
      id: id * 10 + i,
      amountCentavos,
      method,
      collectedById: by,
      collectedByName: by === "rosa" ? "Rosa" : "Benjo",
      at: paidAt,
    })),
    history: [
      { status: "new", at: o.created, byName: "Customer" },
      ...(o.delivered ? [{ status: "completed" as const, at: o.delivered, byName: "Benjo" }] : []),
    ],
  } as Order;
}

const orders = [
  // Came in on the 12th, delivered and paid in cash to Benjo on the 13th.
  order({ created: at("12", 9), delivered: at("13", 16), paid: [[10000, "cash", "benjo", at("13", 16)]] }),
  // Came in on the 13th: part paid by GCash to Rosa that day, the rest in cash on the 14th.
  order({
    created: at("13", 8),
    total: 40000,
    delivered: at("14", 10),
    paid: [
      [15000, "gcash", "rosa", at("13", 9)],
      [25000, "cash", "benjo", at("14", 10)],
    ],
  }),
  // Came in on the 13th, delivered the same day, nothing paid yet.
  order({ created: at("13", 10), total: 30000, delivered: at("13", 18) }),
  // Came in on the 13th and was cancelled.
  order({ created: at("13", 11), status: "cancelled", total: 99900 }),
  // Came in late on the 13th Manila time (still the 12th... no: 11 PM on the 13th).
  order({ created: at("13", 23), total: null }),
];

describe("dailySummary (C4)", () => {
  const day = dailySummary(orders, "2026-11-13");

  it("counts the orders that came in, leaving out cancelled ones", () => {
    expect(day.received).toBe(3);
  });

  it("counts the orders delivered that day, whenever they came in", () => {
    expect(day.delivered).toBe(2);
  });

  it("bills the totals of that day's orders", () => {
    expect(day.billedCentavos).toBe(40000 + 30000);
  });

  it("totals the money taken that day by method", () => {
    expect(day.collectedByMethod).toEqual({ cash: 10000, gcash: 15000, bank: 0 });
    expect(day.collectedCentavos).toBe(25000);
  });

  it("splits collections by person, for cash handover", () => {
    expect(day.collectedByPerson.map((p) => [p.name, p.totalCentavos])).toEqual([
      ["Rosa", 15000],
      ["Benjo", 10000],
    ]);
  });

  it("is empty on a day with nothing", () => {
    const empty = dailySummary(orders, "2026-11-01");
    expect([empty.received, empty.delivered, empty.collectedCentavos]).toEqual([0, 0, 0]);
  });
});

describe("a staff member's own collections (C6)", () => {
  it("only includes payments that person collected", () => {
    const mine = dailySummary(orders, "2026-11-14", "benjo");
    expect(mine.collectedCentavos).toBe(25000);
    expect(mine.payments.map((p) => p.collectedByName)).toEqual(["Benjo"]);
    expect(dailySummary(orders, "2026-11-14", "rosa").collectedCentavos).toBe(0);
  });
});

describe("unpaid (C4, C5)", () => {
  it("adds up everything still owed, ignoring cancelled orders and orders with no total", () => {
    expect(unpaidBalance(orders)).toBe(30000);
  });

  it("lists delivered orders that are not fully paid, oldest first", () => {
    const older = order({ created: at("10", 9), total: 20000, delivered: at("11", 9) });
    expect(unpaidDelivered([...orders, older]).map((o) => o.amountCentavos)).toEqual([20000, 30000]);
  });
});

describe("the order list (B1, B4)", () => {
  it("puts the newest order first", () => {
    expect(newestFirst(orders)[0].createdAt).toBe(at("13", 23));
  });

  it("finds orders by name, phone number in any format, or order number", () => {
    const grace = order({ created: at("13", 8), name: "Grace Villanueva", phone: "+639171234567" });
    expect(matchesSearch(grace, "villa")).toBe(true);
    expect(matchesSearch(grace, "0917 123")).toBe(true);
    expect(matchesSearch(grace, "+63917")).toBe(true);
    expect(matchesSearch(grace, `#${grace.number}`)).toBe(true);
    expect(matchesSearch(grace, "")).toBe(true);
    expect(matchesSearch(grace, "ramon")).toBe(false);
    expect(matchesSearch(grace, "0918")).toBe(false);
  });
});

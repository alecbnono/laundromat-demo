import { describe, expect, it } from "vitest";
import { balanceCentavos, paidCentavos, payState, totalFor } from "./money";
import type { Order } from "./types";

const order = (amountCentavos: number | null, paid: number[], status = "ready") =>
  ({ amountCentavos, status, payments: paid.map((p) => ({ amountCentavos: p })) }) as Order;

describe("totalFor (C1)", () => {
  it("is kilos times the price per kilo", () => expect(totalFor(7.5, 3500)).toBe(26250));
  it("rounds to the nearest centavo", () => expect(totalFor(3.333, 3500)).toBe(11666));
});

describe("payments and balance (C3)", () => {
  it("is unpaid with the whole total owed before any payment", () => {
    const o = order(36000, []);
    expect([payState(o), paidCentavos(o), balanceCentavos(o)]).toEqual(["unpaid", 0, 36000]);
  });

  it("is partial after a part payment", () => {
    const o = order(36000, [10000, 5000]);
    expect([payState(o), paidCentavos(o), balanceCentavos(o)]).toEqual(["partial", 15000, 21000]);
  });

  it("is paid when the payments reach the total", () => {
    const o = order(36000, [30000, 6000]);
    expect([payState(o), balanceCentavos(o)]).toEqual(["paid", 0]);
  });

  it("never shows a negative balance if the total is lowered after paying", () => {
    expect(balanceCentavos(order(20000, [36000]))).toBe(0);
  });

  it("owes nothing while there is no total, or once cancelled", () => {
    expect(balanceCentavos(order(null, []))).toBe(0);
    expect(balanceCentavos(order(36000, [], "cancelled"))).toBe(0);
  });
});

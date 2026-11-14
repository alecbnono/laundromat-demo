"use client";

import { useState, type ReactNode } from "react";
import { useGo } from "@/components/AppLink";
import { useOrders } from "@/components/owner/data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBackend, useMe } from "@/lib/backend";
import { formatDateTime, formatDay, manilaDate, peso } from "@/lib/format";
import { useOwnerUi } from "@/lib/owner-store";
import { dailySummary, unpaidBalance, unpaidDelivered, type ByMethod } from "@/lib/summary";
import { PAYMENT_LABEL, PAYMENT_METHODS } from "@/lib/types";

function Tile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="font-bold">{title}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const Row = ({ label, value }: { label: ReactNode; value: ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 py-1">
    <dt>{label}</dt>
    <dd className="font-semibold tabular-nums">{value}</dd>
  </div>
);

const methodsLine = (byMethod: ByMethod) =>
  PAYMENT_METHODS.filter((m) => byMethod[m] > 0)
    .map((m) => `${m === "bank" ? "Bank" : PAYMENT_LABEL[m]} ${peso(byMethod[m])}`)
    .join(" · ");

/**
 * C4: the daily summary for a chosen date. The owner sees the whole shop; staff see only
 * what they collected themselves (C6), so the cash they hand over can be checked.
 */
export default function SummaryScreen() {
  const backend = useBackend();
  const me = useMe();
  const go = useGo();
  const setFilter = useOwnerUi((s) => s.setFilter);
  const orders = useOrders();
  const today = manilaDate();
  const [date, setDate] = useState(today);
  const owner = me.role === "owner";
  const day = dailySummary(orders, date || today, owner ? undefined : me.id);
  const unpaid = unpaidDelivered(orders);

  return (
    <div className="grid gap-3.5">
      <Field className="gap-1">
        <FieldLabel htmlFor="summary-date">
          {owner ? "Summary for" : "My collections for"}{" "}
          <span className="font-normal text-muted-foreground">({formatDay(date || today)})</span>
        </FieldLabel>
        <Input
          id="summary-date"
          name="date"
          type="date"
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      {owner && (
        <div className="grid grid-cols-2 gap-2.5">
          <Tile label="Orders received" value={day.received} />
          <Tile label="Orders delivered" value={day.delivered} />
          <Tile label="Total billed" value={peso(day.billedCentavos)} />
          <Tile label="Total collected" value={peso(day.collectedCentavos)} />
        </div>
      )}

      <Section title={owner ? "Collected by method" : "What I collected"}>
        <dl data-testid="by-method">
          {PAYMENT_METHODS.map((m) => (
            <Row key={m} label={PAYMENT_LABEL[m]} value={peso(day.collectedByMethod[m])} />
          ))}
          <div className="mt-1 border-t pt-1">
            <Row label={<strong>Total</strong>} value={peso(day.collectedCentavos)} />
          </div>
        </dl>
      </Section>

      {owner && (
        <Section title="Collected by person">
          {day.collectedByPerson.length === 0 ? (
            <p className="text-muted-foreground">No payments were recorded on this day.</p>
          ) : (
            <dl data-testid="by-person">
              {day.collectedByPerson.map((p) => (
                <Row
                  key={p.id ?? p.name}
                  label={
                    <>
                      {p.name}
                      <span className="block text-sm text-muted-foreground">
                        {methodsLine(p.byMethod)}
                      </span>
                    </>
                  }
                  value={peso(p.totalCentavos)}
                />
              ))}
            </dl>
          )}
        </Section>
      )}

      <Section title={owner ? "Payments on this day" : "My payments on this day"}>
        {day.payments.length === 0 ? (
          <p className="text-muted-foreground">None.</p>
        ) : (
          <ul className="grid gap-1.5 text-sm">
            {day.payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span>
                  #{p.orderNumber} {p.customerName}
                  <span className="block text-muted-foreground">
                    {PAYMENT_LABEL[p.method]}
                    {owner && ` · ${p.collectedByName}`} · {formatDateTime(p.at)}
                  </span>
                </span>
                <strong className="tabular-nums">{peso(p.amountCentavos)}</strong>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {owner && (
        <Section title="Unpaid balance">
          <p className="text-2xl font-bold">{peso(unpaidBalance(orders))}</p>
          <p className="mb-3 text-sm text-muted-foreground">
            Everything still owed to the shop right now, on all orders (not only this day&apos;s).
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilter("unpaid");
              go(backend.paths.orders);
            }}
          >
            Delivered but not fully paid: {unpaid.length}
          </Button>
        </Section>
      )}
    </div>
  );
}

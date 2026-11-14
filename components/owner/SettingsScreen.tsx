"use client";

import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Plus, Save, Trash2 } from "lucide-react";
import { useListChange, useServices, useTeam } from "@/components/owner/data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useBackend, useMe, useShop } from "@/lib/backend";
import { copyText } from "@/lib/clipboard";
import { pesosInput } from "@/lib/format";
import type { Member, Service } from "@/lib/types";
import { MAX_PESOS, parseAmount, staffSchema, type StaffForm } from "@/lib/validation";

const noop = () => () => {};

/** A1: the shop's own public form link, to share with customers. */
function FormLink() {
  const backend = useBackend();
  const shop = useShop();
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
  const link = origin + backend.paths.form(shop);
  const [copied, setCopied] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="font-bold">Customer form link</h3>
        </CardTitle>
        <CardDescription>
          Send this to customers or put it on your Facebook page. They fill it in without an
          account.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        <p className="rounded-lg bg-muted px-3 py-2 text-sm [overflow-wrap:anywhere]">{link}</p>
        <Button
          variant="outline"
          onClick={async () => {
            await copyText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </CardContent>
    </Card>
  );
}

/** One service: name, price per kilo, and whether customers are offered it. */
function ServiceRow({ service }: { service?: Service }) {
  const backend = useBackend();
  const { busy, change } = useListChange<Service>("services");
  const [name, setName] = useState(service?.name ?? "");
  const [price, setPrice] = useState(service ? pesosInput(service.pricePerKgCentavos) : "");
  const [error, setError] = useState("");
  const key = service?.id ?? "new";

  function save(active: boolean, done: string) {
    const pesos = parseAmount(price, MAX_PESOS);
    if (!name.trim()) return setError("Enter the service name.");
    if (pesos == null) return setError("Enter the price per kilo as a number.");
    setError("");
    change(
      () =>
        backend.saveService({
          id: service?.id,
          name: name.trim(),
          pricePerKgCentavos: Math.round(pesos * 100),
          active,
        }),
      done,
    );
    if (!service) {
      setName("");
      setPrice("");
    }
  }

  return (
    <li className="grid gap-2 border-b pb-3 last:border-b-0 last:pb-0">
      <div className="grid grid-cols-[1fr_6.5rem] gap-2">
        <Field className="gap-1">
          <FieldLabel htmlFor={`service-name-${key}`} className="font-normal text-muted-foreground">
            {service ? "Service" : "New service"}
          </FieldLabel>
          <Input
            id={`service-name-${key}`}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field className="gap-1">
          <FieldLabel htmlFor={`service-price-${key}`} className="font-normal text-muted-foreground">
            ₱ per kilo
          </FieldLabel>
          <Input
            id={`service-price-${key}`}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {service ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => save(service.active, "Service saved")}
            >
              <Save data-icon="inline-start" /> Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                save(!service.active, service.active ? "Service hidden" : "Service offered again")
              }
            >
              {service.active ? "Hide from customers" : "Offer again"}
            </Button>
            {!service.active && <Badge variant="secondary">Hidden</Badge>}
          </>
        ) : (
          <Button variant="outline" size="sm" disabled={busy} onClick={() => save(true, "Service added")}>
            <Plus data-icon="inline-start" /> Add service
          </Button>
        )}
      </div>
      <FieldError>{error}</FieldError>
    </li>
  );
}

/** D2: who can log in, and adding or removing staff. */
function Team() {
  const backend = useBackend();
  const team = useTeam();
  const { busy, change, changeAsync } = useListChange<Member>("team");
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const add = handleSubmit(async (values) => {
    try {
      await changeAsync(() => backend.addStaff(values), "Staff added");
      reset();
    } catch (e) {
      const fields = e instanceof ApiError ? Object.entries(e.fieldErrors) : [];
      for (const [field, messages] of fields)
        setError(field as keyof StaffForm, { message: messages[0] });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3 className="font-bold">Team</h3>
        </CardTitle>
        <CardDescription>
          Staff and riders can see and update orders and record payments. Only you can change
          prices and the team.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ul className="grid gap-2">
          {team.map((m) => (
            <li key={m.id} className="flex items-center gap-2" data-member={m.email}>
              <span className="min-w-0 flex-1">
                <strong className="font-semibold">{m.name}</strong>{" "}
                <Badge variant={m.role === "owner" ? "info" : "secondary"}>
                  {m.role === "owner" ? "Owner" : "Staff"}
                </Badge>
                <span className="block text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {m.email}
                </span>
              </span>
              {m.role === "staff" && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => change(() => backend.removeStaff(m.id), "Staff removed")}
                >
                  <Trash2 data-icon="inline-start" /> Remove
                </Button>
              )}
            </li>
          ))}
        </ul>

        <form onSubmit={add} noValidate className="border-t pt-4">
          <FieldGroup className="gap-3">
            <h4 className="font-semibold">Add a staff login</h4>
            {backend.demo && (
              <Alert variant="warning">
                <AlertDescription>
                  Demo: this only adds a name to the list. No login is created.
                </AlertDescription>
              </Alert>
            )}
            <Field data-invalid={!!errors.name} className="gap-1">
              <FieldLabel htmlFor="staff-name">Name</FieldLabel>
              <Input {...register("name")} id="staff-name" aria-invalid={!!errors.name} />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>
            <Field data-invalid={!!errors.email} className="gap-1">
              <FieldLabel htmlFor="staff-email">Email (their login name)</FieldLabel>
              <Input
                {...register("email")}
                id="staff-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                aria-invalid={!!errors.email}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </Field>
            <Field data-invalid={!!errors.password} className="gap-1">
              <FieldLabel htmlFor="staff-password">Password (8 or more characters)</FieldLabel>
              <Input
                {...register("password")}
                id="staff-password"
                autoComplete="off"
                aria-invalid={!!errors.password}
              />
              <FieldError>{errors.password?.message}</FieldError>
            </Field>
            <Button type="submit" variant="outline" disabled={busy}>
              <Plus data-icon="inline-start" /> Add staff
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

/** Owner only: the form link, services and prices (C1), and the team (D2). */
export default function SettingsScreen() {
  const me = useMe();
  const services = useServices();

  if (me.role !== "owner")
    return (
      <Alert variant="warning">
        <AlertDescription>Only the shop owner can change settings.</AlertDescription>
      </Alert>
    );

  return (
    <div className="grid gap-3.5">
      <FormLink />
      <Card>
        <CardHeader>
          <CardTitle>
            <h3 className="font-bold">Services and prices</h3>
          </CardTitle>
          <CardDescription>
            An order&apos;s total is its kilos times the price here. You can still type a
            different total on any order.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3">
            {services.map((s) => (
              <ServiceRow key={`${s.id}-${s.name}-${s.pricePerKgCentavos}`} service={s} />
            ))}
            <ServiceRow />
          </ul>
        </CardContent>
      </Card>
      <Team />
    </div>
  );
}

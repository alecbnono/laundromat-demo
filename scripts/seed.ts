// Creates the SAMPLE shop for demos and testing: prices, sample orders with a few days of
// history and payments, and (outside production) an owner and a staff login.
//   npm run seed
// If the sample shop already has orders it stops, unless you pass --reset, which deletes
// that shop's orders and customers and loads the samples again:
//   npm run seed -- --reset
// Other shops are never touched. Phone numbers use the unassigned 0900 prefix so a demo SMS
// can't reach a real person.
import {
  addPayment,
  countOrders,
  createOrder,
  deleteAllOrders,
  updateOrder,
} from "../lib/db/orders.ts";
import { createShop, getShopBySlug, listServices, saveService } from "../lib/db/shops.ts";
import { listTeam, saveMember } from "../lib/db/team.ts";
import {
  SAMPLE_ORDERS,
  SAMPLE_SERVICES,
  SAMPLE_SHOP,
  SAMPLE_TEAM,
  sampleTimeline,
} from "../lib/sample-data.ts";

const shop = (await getShopBySlug(SAMPLE_SHOP.slug)) ?? (await createShop(SAMPLE_SHOP));

const existing = await countOrders(shop.id);
if (existing > 0) {
  if (!process.argv.includes("--reset")) {
    console.error(
      `${shop.name} already has ${existing} order(s). Nothing changed.\n` +
        "To delete its orders and customers and load the samples: npm run seed -- --reset",
    );
    process.exit(1);
  }
  await deleteAllOrders(shop.id);
}

if ((await listServices(shop.id)).length === 0)
  for (const s of SAMPLE_SERVICES)
    await saveService(shop.id, { name: s.name, pricePerKgCentavos: s.pesosPerKg * 100, active: true });
const services = await listServices(shop.id);

// Payments need someone to have collected them, so the sample logins come first.
for (const m of SAMPLE_TEAM) await saveMember({ ...m, shopId: shop.id });
const team = await listTeam(shop.id);
const person = (key: string) => {
  const email = SAMPLE_TEAM.find((m) => m.key === key)?.email;
  return team.find((m) => m.email === email);
};

// Oldest first, so the order numbers follow the dates.
const dated = SAMPLE_ORDERS.map((sample, i) => ({ sample, t: sampleTimeline(sample, i) })).sort(
  (a, b) => a.t.createdAt.localeCompare(b.t.createdAt),
);
for (const { sample, t } of dated) {
  const [first, ...later] = t.statuses;
  const { id } = await createOrder(
    shop.id,
    {
      name: sample.name,
      phone: sample.phone,
      address: sample.address,
      landmark: sample.landmark ?? "",
      serviceId: services[sample.service].id,
      intake: sample.intake ?? "pickup",
      pickupDate: t.pickupDate,
      pickupWindow: sample.window,
      fulfillment: sample.fulfillment,
      notes: sample.notes ?? "",
      weightKg: sample.kg ?? null,
      amountCentavos: t.totalCentavos,
    },
    {
      source: sample.intake === "dropoff" ? "manual" : "form",
      byName: person(first.by)?.name ?? "Customer",
      status: first.status,
      createdAt: first.at,
    },
  );
  for (const step of later)
    await updateOrder(
      shop.id,
      id,
      { status: step.status, ...(step.status === "ready" && sample.notified ? { notified: true } : {}) },
      person(step.by)?.name ?? "Customer",
      step.at,
    );
  for (const p of t.payments)
    await addPayment(
      shop.id,
      id,
      { amountCentavos: p.amountCentavos, method: p.method, collectedById: person(p.by)!.id },
      p.at,
    );
}

console.log(`${shop.name}: loaded ${SAMPLE_ORDERS.length} sample orders.`);
console.log(`Customer form: /s/${shop.slug}`);
if (process.env.NODE_ENV === "production") {
  console.log(
    "The sample logins use a published password. Change them now: npm run create-user",
  );
}
for (const m of SAMPLE_TEAM) console.log(`${m.role} login: ${m.email} / ${m.password}`);

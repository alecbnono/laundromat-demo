// Fills the database with SAMPLE orders for demos.   Run: npm run seed
// Refuses to run if orders already exist, unless you pass --reset (which deletes them all):
//   npm run seed -- --reset
// Phone numbers use the unassigned 0900 prefix so a demo SMS can't reach a real person.
// Outside production it also creates a demo owner login (see DEMO_OWNER below).
import { countOrders, createOrder, deleteAllOrders, updateOrder } from "../lib/db/orders.ts";
import { manilaDate } from "../lib/format.ts";
import { DEMO_OWNER } from "../lib/shop.ts";
import { saveOwner } from "../lib/owner-account.ts";
import { samples } from "../lib/sample-orders.ts";

const reset = process.argv.includes("--reset");
const existing = await countOrders();
if (existing > 0) {
  if (!reset) {
    console.error(
      `The database already has ${existing} order(s). Nothing changed.\n` +
        "To delete ALL orders and customers and load the samples: npm run seed -- --reset",
    );
    process.exit(1);
  }
  await deleteAllOrders();
}

for (const s of samples) {
  const { id } = await createOrder({
    name: s.name,
    phone: s.phone,
    address: s.address,
    landmark: s.landmark ?? "",
    service: s.service,
    pickupDate: manilaDate(s.day),
    pickupWindow: s.window,
    fulfillment: s.fulfillment,
    notes: s.notes ?? "",
  });
  await updateOrder(id, {
    status: s.status,
    weightKg: s.kg ?? null,
    amountCentavos: s.pesos != null ? s.pesos * 100 : null,
    ...(s.paid ? { paymentMethod: s.paid } : {}),
    ...(s.notified ? { notified: true } : {}),
  });
}
console.log(`Loaded ${samples.length} sample orders.`);

if (process.env.NODE_ENV !== "production") {
  await saveOwner(DEMO_OWNER);
  console.log(`Demo owner login: ${DEMO_OWNER.email} / ${DEMO_OWNER.password}`);
}

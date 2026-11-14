// Creates a shop without editing code (D3): its name, logo, services and prices, and the
// owner's login.   npm run create-shop
// It asks a few questions. To run it unattended, answer with environment variables:
//   SHOP_NAME, SHOP_SLUG, SHOP_PHONE, SHOP_TAGLINE, SHOP_HOURS, SHOP_LOGO (image file),
//   SHOP_SERVICES ("Wash and fold=35; Wash and iron=60"), SHOP_PICKUP_TIMES ("8 to 10 AM; ..."),
//   OWNER_NAME, OWNER_EMAIL, OWNER_PASSWORD
// The owner adds staff afterwards, in Settings.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createShop, getShopBySlug, saveService } from "../lib/db/shops.ts";
import { saveMember } from "../lib/db/team.ts";
import { normalizePhone } from "../lib/format.ts";
import { SAMPLE_SHOP } from "../lib/sample-data.ts";
import { ask, done, stop } from "./ask.ts";

const IMAGE_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
const MAX_LOGO_BYTES = 150_000;
const list = (text: string) =>
  text
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

const name = await ask("SHOP_NAME", "Shop name");
if (!name) stop("A shop needs a name.");

const suggested = name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const slug = await ask("SHOP_SLUG", "Link name (the form will be at /s/<link name>)", suggested);
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
  stop("The link name can only have small letters, numbers and dashes, e.g. quicklaba-manila.");
if (await getShopBySlug(slug)) stop(`There is already a shop at /s/${slug}.`);

const phone = normalizePhone(await ask("SHOP_PHONE", "Shop mobile number (shown to customers)"));
if (!phone) stop("Enter a mobile number like 0917 123 4567.");

const tagline = await ask("SHOP_TAGLINE", "Area or tagline (e.g. Pickup and delivery around Sampaloc)", "");
const hours = await ask("SHOP_HOURS", "Opening hours (e.g. Open daily, 7 AM to 8 PM)", "");

let logo = "/logo.svg";
const logoFile = await ask("SHOP_LOGO", "Logo image file (leave empty for the default)", "");
if (logoFile) {
  const type = IMAGE_TYPES[path.extname(logoFile).toLowerCase()];
  if (!type) stop("The logo must be an .svg, .png, .jpg or .webp file.");
  const bytes = readFileSync(logoFile);
  if (bytes.length > MAX_LOGO_BYTES)
    stop(`The logo is ${Math.round(bytes.length / 1000)} KB. Use one under 150 KB.`);
  logo = `data:${type};base64,${bytes.toString("base64")}`;
}

const services = list(
  await ask("SHOP_SERVICES", "Services and price per kilo, e.g. Wash and fold=35; Wash and iron=60"),
).map((entry) => {
  const [serviceName, price] = entry.split("=").map((part) => part.trim());
  const pesos = Number(price);
  if (!serviceName || !Number.isFinite(pesos) || pesos < 0)
    stop(`Could not read "${entry}". Write each service as Name=price, e.g. Wash and fold=35.`);
  return { name: serviceName, pricePerKgCentavos: Math.round(pesos * 100), active: true };
});
if (services.length === 0) stop("Add at least one service.");

const pickupWindows = list(
  await ask("SHOP_PICKUP_TIMES", "Pickup times, separated by ;", SAMPLE_SHOP.pickupWindows.join("; ")),
);

const ownerName = await ask("OWNER_NAME", "Owner's name");
const email = await ask("OWNER_EMAIL", "Owner's email (their login name)");
const password = await ask("OWNER_PASSWORD", "Owner's password (8+ characters, shown as you type)");
if (!ownerName || !email.includes("@") || password.length < 8)
  stop("The owner needs a name, an email and a password of 8 or more characters.");
done();

const shop = await createShop({
  slug,
  name,
  tagline,
  logo,
  phone,
  hours,
  pickupWindows,
  maxDaysAhead: SAMPLE_SHOP.maxDaysAhead,
});
for (const service of services) await saveService(shop.id, service);
try {
  await saveMember({ shopId: shop.id, role: "owner", name: ownerName, email, password });
} catch (e) {
  console.error(
    `The shop was created, but not the owner's login: ${e instanceof Error ? e.message : e}\n` +
      "Add it with: npm run create-user",
  );
  process.exit(1);
}

console.log(`\nCreated ${shop.name}.`);
console.log(`Customer form: /s/${shop.slug}`);
console.log(`Owner login:   ${email.trim().toLowerCase()} at /owner/login`);

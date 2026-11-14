// Creates a login for a shop, or resets the password if the email already belongs to it.
//   npm run create-user
// Staff are normally added by the owner in Settings. Use this for a forgotten password, or
// to make an owner login. To run it unattended, set:
//   USER_SHOP (the shop's link name), USER_ROLE (owner or staff), USER_NAME, USER_EMAIL,
//   USER_PASSWORD
import { getShopBySlug, listShops } from "../lib/db/shops.ts";
import { saveMember } from "../lib/db/team.ts";
import { ask, done, stop } from "./ask.ts";

const shops = await listShops();
if (shops.length === 0) stop("There are no shops yet. Create one first: npm run create-shop");
console.log(`Shops: ${shops.map((s) => s.slug).join(", ")}`);

const shop = await getShopBySlug(await ask("USER_SHOP", "Shop link name", shops[0].slug));
if (!shop) stop("There is no shop with that link name.");
const role = await ask("USER_ROLE", "Role (owner or staff)", "staff");
if (role !== "owner" && role !== "staff") stop("The role must be owner or staff.");
const name = await ask("USER_NAME", "Their name");
const email = await ask("USER_EMAIL", "Email (their login name)");
const password = await ask("USER_PASSWORD", "Password (8+ characters, shown as you type)");
if (!name || !email.includes("@")) stop("A login needs a name and an email.");
done();

try {
  const result = await saveMember({ shopId: shop.id, role, name, email, password });
  console.log(
    result === "created"
      ? `${role} login created for ${email.trim().toLowerCase()} at ${shop.name}.`
      : `Password reset for ${email.trim().toLowerCase()} at ${shop.name}.`,
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

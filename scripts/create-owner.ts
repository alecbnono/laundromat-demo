// Creates the owner's login, or resets the password if the email already exists.
//   npm run create-owner
// It asks for the email and password. For automation, set OWNER_EMAIL and OWNER_PASSWORD.
import { createInterface } from "node:readline/promises";
import { saveOwner } from "../lib/owner-account.ts";

let email = process.env.OWNER_EMAIL;
let password = process.env.OWNER_PASSWORD;

if (!email || !password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  email ||= await rl.question("Owner email: ");
  password ||= await rl.question("Password (8+ characters, shown as you type): ");
  rl.close();
}

try {
  const result = await saveOwner({ email, password });
  console.log(
    result === "created"
      ? `Owner login created for ${email.trim().toLowerCase()}.`
      : `Password reset for ${email.trim().toLowerCase()}.`,
  );
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

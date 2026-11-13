// Owner login (BetterAuth): email and password, sessions kept in the database.
// There is no public sign-up. Owner accounts are made with `npm run create-owner`.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "./db/index.ts";

// In development the app is opened at localhost and, for phone demos, at this computer's
// Wi-Fi address (e.g. http://192.168.1.5:3000), so accept any private-network address.
// Production must set BETTER_AUTH_URL to the one real address.
const DEV_BASE_URL = {
  allowedHosts: ["localhost", "localhost:*", "127.0.0.1:*", "192.168.*", "10.*", "172.*"],
  protocol: "auto" as const, // plain http is fine on a home network
  fallback: "http://localhost:3000", // used by the scripts, which have no web address
};

export function createAuth({ allowSignUp = false } = {}) {
  return betterAuth({
    baseURL:
      process.env.BETTER_AUTH_URL ??
      (process.env.NODE_ENV === "production" ? undefined : DEV_BASE_URL),
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignUp,
      minPasswordLength: 8,
    },
    session: { expiresIn: 60 * 60 * 24 * 30 }, // stay logged in for 30 days
    // BetterAuth turns rate limiting on in production. Tighter limit for password guesses:
    rateLimit: {
      customRules: { "/sign-in/email": { window: 600, max: 10 } },
    },
  });
}

export const auth = createAuth();

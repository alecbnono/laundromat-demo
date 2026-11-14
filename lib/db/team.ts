// A shop's logins: its owner and staff (D2). Used by Settings and by the scripts.
import { and, asc, eq } from "drizzle-orm";
import { auth } from "../auth.ts";
import { db, ready } from "./index.ts";
import { user } from "./schema.ts";
import type { Member, Role } from "../types.ts";

export async function listTeam(shopId: number): Promise<Member[]> {
  await ready();
  const rows = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.shopId, shopId))
    .orderBy(asc(user.createdAt));
  // Owner first, then staff in the order they were added.
  return rows.sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner"));
}

export class TeamError extends Error {}

/**
 * Creates a login for a shop. If the email already belongs to this shop, sets its password
 * (and name) instead, which is how a forgotten password is reset.
 */
export async function saveMember(input: {
  shopId: number;
  role: Role;
  name: string;
  email: string;
  password: string;
}): Promise<"created" | "password_reset"> {
  await ready();
  const ctx = await auth.$context;
  const email = input.email.trim().toLowerCase();
  const min = ctx.password.config.minPasswordLength;
  if (input.password.length < min)
    throw new TeamError(`Password must be at least ${min} characters.`);
  const password = await ctx.password.hash(input.password);

  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    const [row] = await db.select().from(user).where(eq(user.id, existing.user.id));
    if (row.shopId !== input.shopId)
      throw new TeamError("That email is already used by a login at another shop.");
    await ctx.internalAdapter.updatePassword(row.id, password);
    await db.update(user).set({ name: input.name, role: input.role }).where(eq(user.id, row.id));
    return "password_reset";
  }

  const created = await ctx.internalAdapter.createUser(
    { email, name: input.name, emailVerified: false, shopId: input.shopId, role: input.role },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password,
  });
  return "created";
}

/** Removes a staff login from this shop (never the owner). Their payments keep their name. */
export async function removeStaff(shopId: number, id: string): Promise<boolean> {
  await ready();
  const removed = await db
    .delete(user)
    .where(and(eq(user.id, id), eq(user.shopId, shopId), eq(user.role, "staff")))
    .returning({ id: user.id });
  return removed.length > 0;
}

// Creates an owner login, or resets its password. Used by scripts only (there is no
// public sign-up page).
import { createAuth } from "./auth.ts";
import { ready } from "./db/index.ts";

export async function saveOwner(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<"created" | "password_reset"> {
  await ready();
  const auth = createAuth({ allowSignUp: true });
  const ctx = await auth.$context;
  const email = input.email.trim().toLowerCase();

  if (input.password.length < ctx.password.config.minPasswordLength)
    throw new Error(
      `Password must be at least ${ctx.password.config.minPasswordLength} characters.`,
    );

  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    await ctx.internalAdapter.updatePassword(
      existing.user.id,
      await ctx.password.hash(input.password),
    );
    return "password_reset";
  }

  await auth.api.signUpEmail({
    body: { email, password: input.password, name: input.name ?? "Owner" },
  });
  return "created";
}

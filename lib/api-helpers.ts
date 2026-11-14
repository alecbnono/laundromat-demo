// Shared by the API routes.
import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderError } from "./db/orders";
import { DuplicateServiceError } from "./db/shops";
import { TeamError } from "./db/team";
import { getSession, type Session } from "./session";

export const fail = (status: number, error: string, extra?: object) =>
  NextResponse.json({ error, ...extra }, { status });

export const invalid = (error: z.ZodError) =>
  fail(400, "Please check the form and try again.", {
    fieldErrors: z.flattenError(error).fieldErrors,
  });

/** The logged-in person, or the response to send back instead. */
export async function requireSession(
  { ownerOnly = false } = {},
): Promise<{ session: Session; denied?: undefined } | { denied: NextResponse; session?: undefined }> {
  const session = await getSession();
  if (!session) return { denied: fail(401, "Please log in again.") };
  if (ownerOnly && session.me.role !== "owner")
    return { denied: fail(403, "Only the shop owner can do that.") };
  return { session };
}

/** A positive whole number from the address, or null. */
export const idParam = (raw: string) => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** Turns the errors we raise on purpose into a message for the person; rethrows the rest. */
export function explain(e: unknown) {
  if (e instanceof OrderError || e instanceof DuplicateServiceError || e instanceof TeamError)
    return fail(400, e.message);
  throw e;
}

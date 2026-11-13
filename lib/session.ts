import { headers } from "next/headers";
import { auth } from "./auth";
import { ready } from "./db";

/** The logged-in owner's session, or null. Every account in the database is an owner. */
export async function getOwnerSession() {
  await ready();
  return auth.api.getSession({ headers: await headers() });
}

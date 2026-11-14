import { headers } from "next/headers";
import { auth } from "./auth";
import { ready } from "./db";
import type { Member, Role } from "./types";

export interface Session {
  /** The logged-in person. */
  me: Member;
  /** The only shop whose data they may see or change (D1). */
  shopId: number;
}

/** Who is logged in, or null. Every query made for them must be limited to `shopId`. */
export async function getSession(): Promise<Session | null> {
  await ready();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role, shopId } = session.user;
  return { me: { id, name, email, role: role === "owner" ? "owner" : ("staff" as Role) }, shopId };
}

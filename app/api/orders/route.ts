import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, listOrders } from "@/lib/db/orders";
import { normalizePhone } from "@/lib/format";
import { getOwnerSession } from "@/lib/session";
import { pickupRequestSchema } from "@/lib/validation";

/** Owner: every order, for the order list. */
export async function GET() {
  if (!(await getOwnerSession()))
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  return NextResponse.json(await listOrders());
}

/** Customer: submit a pickup request. Public, no login. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = pickupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the form and try again.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const { website, phone, ...rest } = parsed.data;
  // Hidden field that people never fill in; bots usually do.
  if (website) {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 400 },
    );
  }

  const { token } = await createOrder({ ...rest, phone: normalizePhone(phone)! });
  return NextResponse.json({ token }, { status: 201 });
}

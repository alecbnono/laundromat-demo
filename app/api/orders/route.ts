import { NextResponse } from "next/server";
import { explain, fail, invalid, requireSession } from "@/lib/api-helpers";
import { createOrder, getOrder, listOrders } from "@/lib/db/orders";
import { getShop, getShopBySlug, listServices } from "@/lib/db/shops";
import { manilaDate, normalizePhone } from "@/lib/format";
import { getSession } from "@/lib/session";
import type { Shop } from "@/lib/types";
import { manualOrderSchema, parseAmount, pickupRequestSchema, MAX_KG } from "@/lib/validation";

/** Owner and staff: every order of their shop. */
export async function GET() {
  const { session, denied } = await requireSession();
  if (denied) return denied;
  return NextResponse.json(await listOrders(session.shopId));
}

async function formOptions(shop: Shop) {
  const services = await listServices(shop.id, { activeOnly: true });
  return {
    serviceIds: services.map((s) => s.id),
    pickupWindows: shop.pickupWindows,
    maxDaysAhead: shop.maxDaysAhead,
  };
}

/**
 * Two callers:
 * - A customer submitting a shop's public form: { shop: "<slug>", ...form }. No login.
 * - Owner or staff adding an order by hand (B5): { manual: true, ...form }.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return fail(400, "Please check the form and try again.");
  return body.manual === true ? manualOrder(body) : publicRequest(body);
}

async function publicRequest(body: { shop?: unknown }) {
  const shop = typeof body.shop === "string" ? await getShopBySlug(body.shop) : null;
  if (!shop) return fail(404, "This shop's form is not available.");

  const parsed = pickupRequestSchema(await formOptions(shop)).safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  const { website, phone, serviceId, ...rest } = parsed.data;
  // Hidden field that people never fill in; bots usually do (A6).
  if (website) return fail(400, "Something went wrong. Please try again.");

  const { token } = await createOrder(
    shop.id,
    { ...rest, phone: normalizePhone(phone)!, serviceId: Number(serviceId), intake: "pickup" },
    { source: "form", byName: "Customer" },
  );
  return NextResponse.json({ token }, { status: 201 });
}

async function manualOrder(body: object) {
  const session = await getSession();
  if (!session) return fail(401, "Please log in again.");
  const shop = await getShop(session.shopId);
  if (!shop) return fail(404, "Shop not found.");

  const parsed = manualOrderSchema(await formOptions(shop)).safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  const { phone, serviceId, weightKg, intake, ...rest } = parsed.data;
  const dropOff = intake === "dropoff";
  try {
    const { id } = await createOrder(
      shop.id,
      {
        ...rest,
        intake,
        phone: normalizePhone(phone)!,
        serviceId: Number(serviceId),
        weightKg: parseAmount(weightKg, MAX_KG) ?? null,
        // A drop-off is already at the shop, so it has no pickup to wait for.
        ...(dropOff ? { pickupDate: manilaDate(), pickupWindow: "" } : {}),
      },
      { source: "manual", byName: session.me.name, status: dropOff ? "picked_up" : "new" },
    );
    return NextResponse.json(await getOrder(shop.id, id), { status: 201 });
  } catch (e) {
    return explain(e);
  }
}

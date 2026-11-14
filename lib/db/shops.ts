// Shops and their services. A shop is created by `npm run create-shop` (D3).
import { and, asc, eq } from "drizzle-orm";
import { db, ready } from "./index.ts";
import { services, shops } from "./schema.ts";
import type { Service, ServiceInput, Shop } from "../types.ts";

const toShop = ({ createdAt: _createdAt, ...shop }: typeof shops.$inferSelect): Shop => shop;
const toService = ({ shopId: _shopId, ...service }: typeof services.$inferSelect): Service =>
  service;

export async function getShop(id: number): Promise<Shop | null> {
  await ready();
  const [row] = await db.select().from(shops).where(eq(shops.id, id));
  return row ? toShop(row) : null;
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  await ready();
  const [row] = await db.select().from(shops).where(eq(shops.slug, slug));
  return row ? toShop(row) : null;
}

export async function listShops(): Promise<Shop[]> {
  await ready();
  return (await db.select().from(shops).orderBy(asc(shops.id))).map(toShop);
}

export async function createShop(input: Omit<Shop, "id">): Promise<Shop> {
  await ready();
  const [row] = await db
    .insert(shops)
    .values({ ...input, createdAt: new Date().toISOString() })
    .returning();
  return toShop(row);
}

/** A shop's services. The public form offers only the active ones. */
export async function listServices(shopId: number, { activeOnly = false } = {}) {
  await ready();
  const rows = await db
    .select()
    .from(services)
    .where(
      activeOnly
        ? and(eq(services.shopId, shopId), eq(services.active, true))
        : eq(services.shopId, shopId),
    )
    .orderBy(asc(services.id));
  return rows.map(toService);
}

export class DuplicateServiceError extends Error {}

/** Adds a service, or changes one of this shop's. Returns false if `id` is not this shop's. */
export async function saveService(shopId: number, input: ServiceInput): Promise<boolean> {
  await ready();
  const { id, ...values } = input;
  try {
    if (id == null) {
      await db.insert(services).values({ ...values, shopId });
      return true;
    }
    const changed = await db
      .update(services)
      .set(values)
      .where(and(eq(services.id, id), eq(services.shopId, shopId)))
      .returning({ id: services.id });
    return changed.length > 0;
  } catch (e) {
    if (String(e instanceof Error ? (e.cause ?? e.message) : e).includes("UNIQUE"))
      throw new DuplicateServiceError("There is already a service with that name.");
    throw e;
  }
}

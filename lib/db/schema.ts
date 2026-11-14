// Database tables (Drizzle ORM, SQLite/libSQL).
// After changing this file run `npm run db:generate` to create a migration.
//
// The six records from BUSINESS-REQUIREMENTS.md: shop, user, service, customer, order,
// payment (plus an order's status history). Everything except a shop carries the shop it
// belongs to, directly or through its order (D1).
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  FULFILLMENTS,
  INTAKES,
  PAYMENT_METHODS,
  ROLES,
  SOURCES,
  STATUSES,
} from "../types.ts";

export const shops = sqliteTable("shops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(), // public form link: /s/<slug>
  name: text("name").notNull(),
  tagline: text("tagline").notNull().default(""),
  logo: text("logo").notNull().default("/logo.svg"), // a path, or the image as a data: URL
  phone: text("phone").notNull(), // +639XXXXXXXXX
  hours: text("hours").notNull().default(""),
  pickupWindows: text("pickup_windows", { mode: "json" }).$type<string[]>().notNull(),
  maxDaysAhead: integer("max_days_ahead").notNull().default(14),
  createdAt: text("created_at").notNull(),
});

export const services = sqliteTable(
  "services",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    pricePerKgCentavos: integer("price_per_kg_centavos").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
  },
  (t) => [uniqueIndex("services_shop_name").on(t.shopId, t.name)],
);

export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(), // +639XXXXXXXXX
    // The address from their latest order. Each order also keeps its own copy.
    address: text("address").notNull().default(""),
    landmark: text("landmark").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  // The same person can be a customer of two shops; within a shop a number is one customer.
  (t) => [uniqueIndex("customers_shop_phone").on(t.shopId, t.phone)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    number: integer("number").notNull(), // the shop's own order number: #1, #2, ...
    token: text("token").notNull().unique(), // private link for the customer
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id),
    status: text("status", { enum: STATUSES }).notNull().default("new"),
    source: text("source", { enum: SOURCES }).notNull().default("form"),
    intake: text("intake", { enum: INTAKES }).notNull().default("pickup"),
    pickupDate: text("pickup_date").notNull(), // YYYY-MM-DD (Manila)
    pickupWindow: text("pickup_window").notNull().default(""),
    fulfillment: text("fulfillment", { enum: FULFILLMENTS }).notNull(),
    address: text("address").notNull().default(""),
    landmark: text("landmark").notNull().default(""),
    notes: text("notes").notNull().default(""),
    weightKg: real("weight_kg"),
    amountCentavos: integer("amount_centavos"), // the order total
    notifiedAt: text("notified_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("orders_shop_number").on(t.shopId, t.number),
    index("orders_shop_status").on(t.shopId, t.status),
  ],
);

/** Status history (B6): one row each time an order's status changes. */
export const orderEvents = sqliteTable(
  "order_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status", { enum: STATUSES }).notNull(),
    byName: text("by_name").notNull(), // "Customer" for the public form
    at: text("at").notNull(),
  },
  (t) => [index("order_events_order").on(t.orderId)],
);

export const payments = sqliteTable(
  "payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    amountCentavos: integer("amount_centavos").notNull(),
    method: text("method", { enum: PAYMENT_METHODS }).notNull(),
    // Who took the money. The name stays if the login is removed later.
    collectedById: text("collected_by_id").references(() => user.id, { onDelete: "set null" }),
    collectedByName: text("collected_by_name").notNull(),
    at: text("at").notNull(),
  },
  (t) => [index("payments_order").on(t.orderId)],
);

// --- Logins (BetterAuth). Table and column names follow BetterAuth's defaults, plus the
// shop each login belongs to and its role.

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const user = sqliteTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }).notNull().default("staff"),
    ...timestamps,
  },
  (t) => [index("user_shop").on(t.shopId)],
);

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("session_user_id").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("account_user_id").on(t.userId)],
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier").on(t.identifier)],
);

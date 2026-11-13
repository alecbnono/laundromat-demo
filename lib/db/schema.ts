// Database tables (Drizzle ORM, SQLite/libSQL).
// After changing this file run `npm run db:generate` to create a migration.
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { FULFILLMENTS, PAYMENT_METHODS, STATUSES } from "../types.ts";

// --- Shop data. Generic on purpose: customer, order, status, pickup/delivery, payment.

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(), // +639XXXXXXXXX
  createdAt: text("created_at").notNull(),
});

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    token: text("token").notNull().unique(), // private link for the customer
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    status: text("status", { enum: STATUSES }).notNull().default("new"),
    service: text("service").notNull(),
    pickupDate: text("pickup_date").notNull(), // YYYY-MM-DD (Manila)
    pickupWindow: text("pickup_window").notNull(),
    fulfillment: text("fulfillment", { enum: FULFILLMENTS }).notNull(),
    address: text("address").notNull(),
    landmark: text("landmark").notNull().default(""),
    notes: text("notes").notNull().default(""),
    weightKg: real("weight_kg"),
    amountCentavos: integer("amount_centavos"),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
    paymentMethod: text("payment_method", { enum: PAYMENT_METHODS }),
    notifiedAt: text("notified_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("orders_status").on(t.status)],
);

// --- Owner login (BetterAuth). Table and column names follow BetterAuth's defaults.

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  ...timestamps,
});

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

// Database connection (Drizzle ORM over libSQL).
// Default: one SQLite file at data/laundry.db. Set DATABASE_URL to move it
// (file:/some/path.db) or to use a hosted libSQL/Turso database (libsql://...).
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema.ts";

function connect() {
  const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "data", "laundry.db")}`;
  const isFile = url.startsWith("file:");
  if (isFile) mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });

  const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  const db = drizzle(client, { schema });

  // Applies any new migrations from ./drizzle, once per server start.
  const ready = (async () => {
    if (isFile) await client.execute("PRAGMA journal_mode = WAL");
    await client.execute("PRAGMA foreign_keys = ON");
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  })();
  // Callers await this; don't also report it as an unhandled rejection.
  ready.catch(() => {});

  return { client, db, ready };
}

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { __laundry?: ReturnType<typeof connect> };
const conn = (globalForDb.__laundry ??= connect());

export const db = conn.db;

/** Resolves when the tables exist. Await this before the first query. */
export const ready = (): Promise<void> => conn.ready;

export { schema };

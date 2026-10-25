import "server-only";
import { join } from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * The database, created on first use:
 * - DATABASE_URL set (Neon or any Postgres): postgres.js. Migrations are applied before `next build`
 *   (scripts/db-migrate.mjs), never at request time.
 * - Otherwise, outside production or when PGLITE_DIR is set: PGlite, an embedded Postgres stored in PGLITE_DIR
 *   (default .data/pglite). Migrations from drizzle/ are applied automatically. Used by `npm run dev` and the tests.
 * - Otherwise (production without a database) the shop backend is off: see backendStatus().
 */
/** Both drivers expose the same Drizzle query API. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

async function createPostgres(url: string) {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  // Small pool: serverless functions run many instances. `prepare: false` keeps Neon's pooler (PgBouncer) happy.
  const client = postgres(url, { max: 3, prepare: false, idle_timeout: 20 });
  return drizzle(client, { schema }) as unknown as Db;
}

async function createPglite(dir: string) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}

/** Why the shop backend (accounts, checkout, admin) is unavailable, or null when it works. */
export function backendStatus(): null | "no-database" | "no-auth-secret" {
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production" && !process.env.PGLITE_DIR) return "no-database";
  if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) return "no-auth-secret";
  return null;
}

const globalForDb = globalThis as unknown as { gethsemaneDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (backendStatus() === "no-database") throw new Error("The shop database is not configured (DATABASE_URL).");
  globalForDb.gethsemaneDb ??= process.env.DATABASE_URL
    ? createPostgres(process.env.DATABASE_URL)
    : createPglite(process.env.PGLITE_DIR ?? join(process.cwd(), ".data/pglite"));
  return globalForDb.gethsemaneDb;
}

export { schema };

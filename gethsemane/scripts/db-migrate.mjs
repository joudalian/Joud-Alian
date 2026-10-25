// Applies the committed SQL migrations (drizzle/) to the Postgres database in DATABASE_URL. Runs before every
// `next build` (prebuild) when DATABASE_URL is set, so a deployment never serves code ahead of its schema.
// Without DATABASE_URL it does nothing: local development and the tests use PGlite, migrated on start.
import { fileURLToPath } from "node:url";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("db:migrate: DATABASE_URL is not set, nothing to migrate (PGlite migrates itself).");
  process.exit(0);
}
const { default: postgres } = await import("postgres");
const { drizzle } = await import("drizzle-orm/postgres-js");
const { migrate } = await import("drizzle-orm/postgres-js/migrator");
const client = postgres(url, { max: 1, prepare: false });
try {
  await migrate(drizzle(client), { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  console.log("db:migrate: database schema is up to date.");
} finally {
  await client.end();
}

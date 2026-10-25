import { defineConfig } from "drizzle-kit";

// `npm run db:generate` writes SQL migrations to drizzle/ from src/server/db/schema.ts (no database needed).
// They are applied by scripts/db-migrate.mjs (Postgres, before `next build`) or automatically on start (PGlite).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
});

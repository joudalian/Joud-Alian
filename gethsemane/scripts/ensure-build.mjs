// Builds the production app for the tests: always with `--rebuild` (used by `npm run verify`), otherwise only when
// no test build exists. Test builds use SITE_URL=http://localhost:3100 (unless one is set) and include the test
// fixture products (NEXT_PUBLIC_CATALOG_FIXTURES=1, src/data/fixtures.ts). A real deployment builds with
// `npm run build` and its own SITE_URL, without fixtures.
import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const marker = new URL("../.next/TEST_BUILD", import.meta.url);
const rebuild = process.argv.includes("--rebuild");
if (rebuild || !existsSync(new URL("../.next/BUILD_ID", import.meta.url)) || !existsSync(marker)) {
  if (!rebuild) console.log("No test build found, running `npm run build` with the test fixtures first...");
  execSync("npm run build", {
    stdio: "inherit",
    env: { ...process.env, SITE_URL: process.env.SITE_URL ?? "http://localhost:3100", NEXT_PUBLIC_CATALOG_FIXTURES: "1" },
  });
  writeFileSync(marker, "Built by scripts/ensure-build.mjs with the test fixtures.\n");
}

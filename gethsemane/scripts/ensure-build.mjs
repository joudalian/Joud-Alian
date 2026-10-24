// Builds the production app for the tests: always with `--rebuild` (used by `npm run verify`), otherwise only when
// no build exists. Tests run on http://localhost:3100, so that is the SITE_URL unless one is set; a real
// deployment must set SITE_URL itself (a production build without one fails in next.config.ts).
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const rebuild = process.argv.includes("--rebuild");
if (rebuild || !existsSync(new URL("../.next/BUILD_ID", import.meta.url))) {
  if (!rebuild) console.log("No production build found, running `npm run build` first...");
  execSync("npm run build", { stdio: "inherit", env: { ...process.env, SITE_URL: process.env.SITE_URL ?? "http://localhost:3100" } });
}

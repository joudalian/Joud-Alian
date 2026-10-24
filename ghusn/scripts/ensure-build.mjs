// `npm test` runs against the production build; build it first if it is missing.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync(new URL("../.next/BUILD_ID", import.meta.url))) {
  console.log("No production build found, running `next build` first...");
  execSync("npx next build", { stdio: "inherit" });
}

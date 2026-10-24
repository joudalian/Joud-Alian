// Fails (exit 1) if a forbidden claim (see scripts/forbidden-claims.mjs) appears in any language's
// messages, in the product data or in the store config texts. The rendered pages are checked too,
// by the crawl in tests/links.spec.ts.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findClaims } from "./forbidden-claims.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const problems = [];

function walk(value, path, source) {
  if (typeof value === "string") {
    for (const label of findClaims(value)) problems.push(`${source} ${path}: "${label}" in "${value.slice(0, 80)}"`);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, source);
  }
}

for (const file of readdirSync(join(root, "messages"))) {
  walk(JSON.parse(readFileSync(join(root, "messages", file), "utf8")), "", `messages/${file}`);
}
const { products } = await import("../src/data/products.ts");
walk(products, "", "src/data/products.ts");
const store = await import("../src/config/store.ts");
walk({ SHIP_FROM_TEXT: store.SHIP_FROM_TEXT, ANNOUNCEMENT: store.ANNOUNCEMENT, SOCIAL: store.SOCIAL }, "", "src/config/store.ts");
if (store.PAYMENT_MODE !== "link" && store.PAYMENT_METHODS.length > 0) {
  problems.push("src/config/store.ts: PAYMENT_METHODS are only allowed when PAYMENT_MODE is \"link\"");
}

if (problems.length) {
  console.error(`Forbidden claims found (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("Claims check passed: no forbidden claims in 10 languages, product data or store config.");

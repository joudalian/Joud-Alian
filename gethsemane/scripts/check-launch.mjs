// Launch gate: `npm run check:launch` (deliberately NOT part of `npm run verify`). Fails (exit 1) while the site
// is not ready to be indexed: catalog gate still closed, placeholder product text or photos, or a site URL that
// is not the real domain. Run it with the production SITE_URL, e.g. `SITE_URL=https://example.com npm run check:launch`.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const problems = [];

const store = await import("../src/config/store.ts");
if (!store.CATALOG_READY) problems.push("CATALOG_READY is false in src/config/store.ts (set it to true as the last launch step).");

const { products } = await import("../src/data/products.ts");
const placeholderHashes = new Set(JSON.parse(readFileSync(join(root, "scripts/placeholder-hashes.json"), "utf8")));
for (const product of products) {
  for (const [locale, text] of Object.entries(product.text)) {
    if (/placeholder/i.test(text.description) || /placeholder/i.test(text.name)) {
      problems.push(`${product.slug}: the ${locale} text still says "Placeholder".`);
    }
  }
  const file = join(root, "public", product.image);
  if (!existsSync(file)) {
    problems.push(`${product.slug}: image ${product.image} does not exist.`);
  } else if (placeholderHashes.has(createHash("sha256").update(readFileSync(file)).digest("hex"))) {
    problems.push(`${product.slug}: ${product.image} is a generated placeholder, not a photo.`);
  }
}

const { resolveSiteUrl } = await import("../src/lib/site-url.ts");
const site = new URL(resolveSiteUrl());
if (!process.env.SITE_URL) problems.push("SITE_URL is not set (run with the production value, e.g. SITE_URL=https://example.com).");
if (site.protocol !== "https:") problems.push(`SITE_URL must use https (got ${site.origin}).`);
if (/(^|\.)vercel\.app$|^localhost$|^127\.|^0\.0\.0\.0$/.test(site.hostname)) {
  problems.push(`SITE_URL must be the real domain, not ${site.hostname}.`);
}

if (problems.length) {
  console.error(`Not ready to launch (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Launch check passed for ${site.origin}: catalog open, real product texts and photos.`);

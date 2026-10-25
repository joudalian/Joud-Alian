// Launch gate: `npm run check:launch` (deliberately NOT part of `npm run verify`). Fails (exit 1) while the site
// is not ready to be indexed: catalog gate still closed, placeholder product text or photos, a site URL that
// is not the real domain, or live payments while shipping rates, the seller's legal details or the refund wording
// are unconfirmed. Run it with the production SITE_URL, e.g. `SITE_URL=https://example.com npm run check:launch`.
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
  if (!product.launchReady) problems.push(`${product.slug}: not marked launchReady (every language written and checked).`);
  if (product.needsReview?.length) problems.push(`${product.slug}: languages still marked for review: ${product.needsReview.join(", ")}.`);
  for (const [locale, text] of Object.entries(product.text)) {
    if (/placeholder/i.test(text.description) || /placeholder/i.test(text.name)) {
      problems.push(`${product.slug}: the ${locale} text still says "Placeholder".`);
    }
  }
  for (const image of product.images) {
    const file = join(root, "catalog/photos", image.file);
    if (!existsSync(file)) {
      problems.push(`${product.slug}: photo catalog/photos/${image.file} does not exist.`);
    } else if (placeholderHashes.has(createHash("sha256").update(readFileSync(file)).digest("hex"))) {
      problems.push(`${product.slug}: catalog/photos/${image.file} is a generated placeholder, not a photo.`);
    }
  }
}
if (process.env.NEXT_PUBLIC_CATALOG_FIXTURES) problems.push("NEXT_PUBLIC_CATALOG_FIXTURES is set: test products would appear in the shop. Unset it.");

const { resolveSiteUrl } = await import("../src/lib/site-url.ts");
const site = new URL(resolveSiteUrl());
if (!process.env.SITE_URL) problems.push("SITE_URL is not set (run with the production value, e.g. SITE_URL=https://example.com).");
if (site.protocol !== "https:") problems.push(`SITE_URL must use https (got ${site.origin}).`);
if (/(^|\.)vercel\.app$|^localhost$|^127\.|^0\.0\.0\.0$/.test(site.hostname)) {
  problems.push(`SITE_URL must be the real domain, not ${site.hostname}.`);
}

// Live payments need the business details a buyer relies on to be confirmed first.
const key = process.env.STRIPE_SECRET_KEY ?? "";
if (/^(sk|rk)_live_/.test(key)) {
  if (!store.SHIPPING_RATES_CONFIRMED) problems.push("Live Stripe key, but SHIPPING_RATES_CONFIRMED is false (confirm SHIPPING_RATES with the carrier).");
  if (store.SHIP_TO_COUNTRIES.length === 0) problems.push("Live Stripe key, but SHIP_TO_COUNTRIES is empty.");
  if (!store.LEGAL_ENTITY_NAME) problems.push("Live Stripe key, but LEGAL_ENTITY_NAME is empty (the seller must be named on /terms).");
  if (!store.GOVERNING_LAW) problems.push("Live Stripe key, but GOVERNING_LAW is empty (ask a lawyer, then set it).");
  if (!store.REFUNDS_CONFIRMED) problems.push("Live Stripe key, but REFUNDS_CONFIRMED is false (check the refund wording on /returns against how you refund in Stripe).");
  if (!process.env.STRIPE_WEBHOOK_SECRET) problems.push("Live Stripe key, but STRIPE_WEBHOOK_SECRET is not set: orders would never be marked paid.");
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) problems.push("Live Stripe key, but RESEND_API_KEY/EMAIL_FROM are not set: customers would get no order confirmation.");
} else if (key) {
  problems.push("STRIPE_SECRET_KEY is a test key: checkout takes no real payments (set the live key to launch payments).");
}

const { findRemovedChannels } = await import("./removed-channels.mjs");
for (const hit of findRemovedChannels(root)) problems.push(`${hit}: the old chat ordering channel was removed; only docs/CHANGELOG.md may mention it.`);

if (problems.length) {
  console.error(`Not ready to launch (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Launch check passed for ${site.origin}: catalog open, real product texts and photos.`);

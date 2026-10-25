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
const { categories } = await import("../src/data/categories.ts");
walk(categories, "", "src/data/categories.ts");
const store = await import("../src/config/store.ts");
walk({ SHIP_FROM_TEXT: store.SHIP_FROM_TEXT, ANNOUNCEMENT: store.ANNOUNCEMENT, SOCIAL: store.SOCIAL }, "", "src/config/store.ts");
// Our social links must be plain profile URLs: no share-tracking parameters.
for (const [network, url] of Object.entries(store.SOCIAL)) {
  if (url && /[?&#](utm_[a-z]+|xtok|_r|_t|mibextid|fbclid|igsh|igshid|si)=/i.test(url)) {
    problems.push(`src/config/store.ts SOCIAL.${network}: remove the tracking parameters from ${url}`);
  }
}
if (store.PAYMENT_MODE !== "link" && store.PAYMENT_METHODS.length > 0) {
  problems.push("src/config/store.ts: PAYMENT_METHODS are only allowed when PAYMENT_MODE is \"link\"");
}

// One source of truth for delivery times: the headline range ("typically 7–15 business days") comes only from
// DELIVERY_TIME in src/config/store.ts. Headline sentences must use its placeholders and the same "typically"
// wording, and no string about delivery may state a literal range other than the configured one.
const deliveryWording = {
  en: { typically: "typically", delivery: /deliver/i, days: "business days" },
  fr: { typically: "généralement", delivery: /livr/i, days: "jours ouvrés" },
  es: { typically: "normalmente", delivery: /entreg/i, days: "días hábiles" },
  it: { typically: "di solito", delivery: /consegn/i, days: "giorni lavorativi" },
  de: { typically: "in der Regel", delivery: /liefer/i, days: "Werktag" },
  el: { typically: "συνήθως", delivery: /παράδοσ/i, days: "εργάσιμ" },
  pl: { typically: "zwykle", delivery: /dostaw/i, days: "dni robocz" },
  ro: { typically: "de obicei", delivery: /livr/i, days: "zile lucrătoare" },
  uk: { typically: "зазвичай", delivery: /доставк/i, days: "робоч" },
  pt: { typically: "normalmente", delivery: /entreg/i, days: "dias úteis" },
};
const headlineKeys = { "home.trust2": ["{min}", "{max}"], "shipping.delivery": ["{min}", "{max}"], "product.shippingSummary": ["{min}", "{max}"], "faq.a7": ["{deliveryMin}", "{deliveryMax}"] };
const { min: headMin, max: headMax } = store.DELIVERY_TIME;
for (const [locale, w] of Object.entries(deliveryWording)) {
  const messages = JSON.parse(readFileSync(join(root, "messages", `${locale}.json`), "utf8"));
  for (const [key, placeholders] of Object.entries(headlineKeys)) {
    const [ns, name] = key.split(".");
    const text = messages[ns]?.[name] ?? "";
    if (!placeholders.every((ph) => text.includes(ph))) problems.push(`messages/${locale}.json ${key}: delivery headline must use ${placeholders.join(" and ")} from DELIVERY_TIME`);
    if (!text.toLowerCase().includes(w.typically.toLowerCase())) problems.push(`messages/${locale}.json ${key}: delivery headline must say "${w.typically}"`);
  }
  const range = new RegExp(`(\\d+)\\s*(?:[–—-]|to|à|a|bis|έως|do|la|до)\\s*(\\d+)\\s+(?:\\p{L}+\\s+)?${w.days}`, "iu");
  const scan = (value, path) => {
    if (typeof value === "string") {
      const m = value.match(range);
      if (m && w.delivery.test(value) && (Number(m[1]) !== headMin || Number(m[2]) !== headMax)) {
        problems.push(`messages/${locale}.json ${path}: states delivery ${m[1]}–${m[2]}, but DELIVERY_TIME is ${headMin}–${headMax} (use the {min}/{max} placeholders)`);
      }
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) scan(v, path ? `${path}.${k}` : k);
    }
  };
  scan(messages, "");
  scan(store.SHIP_FROM_TEXT[locale], "SHIP_FROM_TEXT");
}

if (problems.length) {
  console.error(`Claims check failed (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("Claims check passed: no forbidden claims in 10 languages, product data or store config; delivery headline matches DELIVERY_TIME.");

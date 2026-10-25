// Fails (exit 1) if a forbidden claim (see scripts/forbidden-claims.mjs) appears in any language's
// messages, in the product data or in the store config texts. The rendered pages are checked too,
// by the crawl in tests/links.spec.ts.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findClaims } from "./forbidden-claims.mjs";
import { findRemovedChannels } from "./removed-channels.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const problems = [];

/**
 * Messages that may name the payment provider, because the site renders them only while live payments are on
 * (livePayments() in src/server/payments.ts). They may say "Stripe" and nothing else from the list: card brands,
 * wallets and "secure checkout" badges stay forbidden everywhere.
 */
const NO_EXTRA_FEES =
  /no (extra|additional|hidden) (fees|charges|costs)|duty[-\s]?free|no (customs|duties|import tax)|duties (are )?included|sans frais (supplémentaires|de douane)|sin (costes|cargos|gastos) adicionales|senza costi aggiuntivi|keine (zusätzlichen|weiteren) (kosten|gebühren)|zollfrei|χωρίς (επιπλέον|πρόσθετες) χρεώσεις|bez (dodatkowych|ukrytych) opłat|fără (taxe|costuri) suplimentare|без (додаткових|прихованих) (плат|витрат|зборів)|sem (custos|taxas) adicionais/i;
const PAYMENT_ENABLED_ONLY = new Set(["checkout.stripeNote", "privacy.paymentsStripe"]);
/**
 * Messages that may say "free shipping": the site renders them only while FEATURES.freeShippingBar is on and
 * FREE_SHIPPING_THRESHOLD_USD is set, and the checkout then really charges no standard shipping (src/server/pricing.ts).
 */
const FREE_SHIPPING_ONLY = new Set(["cart.freeShippingProgress", "cart.freeShippingReached", "checkout.freeShippingApplied"]);
const stripeOnly = (text) => !/\b(paypal|apple\s?pay|google\s?pay|visa|mastercard|american express|amex|klarna)\b/i.test(text);

function walk(value, path, source) {
  if (typeof value === "string") {
    for (const label of findClaims(value)) {
      if (label === "payment providers and card brands" && source.startsWith("messages/") && PAYMENT_ENABLED_ONLY.has(path) && stripeOnly(value)) continue;
      if (label === "free shipping" && source.startsWith("messages/") && FREE_SHIPPING_ONLY.has(path)) continue;
      problems.push(`${source} ${path}: "${label}" in "${value.slice(0, 80)}"`);
    }
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
walk({ SHIP_FROM_TEXT: store.SHIP_FROM_TEXT, ANNOUNCEMENT: store.ANNOUNCEMENT, SOCIAL: store.SOCIAL, DUTIES_NOTE_BY_REGION: store.DUTIES_NOTE_BY_REGION }, "", "src/config/store.ts");
// The duties note must never promise that nothing more is due on delivery.
for (const [region, texts] of Object.entries(store.DUTIES_NOTE_BY_REGION)) {
  for (const [locale, text] of Object.entries(texts ?? {})) {
    if (NO_EXTRA_FEES.test(text)) problems.push(`src/config/store.ts DUTIES_NOTE_BY_REGION.${region}.${locale}: never promise "no extra fees" / "duty free" ("${text.slice(0, 60)}")`);
  }
}
// Our social links must be plain profile URLs: no share-tracking parameters.
for (const [network, url] of Object.entries(store.SOCIAL)) {
  if (url && /[?&#](utm_[a-z]+|xtok|_r|_t|mibextid|fbclid|igsh|igshid|si)=/i.test(url)) {
    problems.push(`src/config/store.ts SOCIAL.${network}: remove the tracking parameters from ${url}`);
  }
}
for (const hit of findRemovedChannels(root)) problems.push(`${hit} (the old chat ordering channel was removed; only docs/CHANGELOG.md may mention it)`);

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

// Catalog facts for the tests, derived from the same data the site uses (src/data/, with the test fixtures:
// playwright.config.ts sets NEXT_PUBLIC_CATALOG_FIXTURES=1). Tests never hard-code product names, prices or counts.
import type { Page } from "@playwright/test";
import type { Locale } from "../src/i18n/locales";
import { categories, categoryText, products, productText, unitPriceUsd, type Product } from "../src/lib/catalog";
import { formatPrice, type Currency } from "../src/lib/currency";

export { categories, products };
export type { Product };

/** Real (non-fixture) products. */
export const realProducts = products.filter((p) => !p.fixture);

/** Pieces that can be added straight from a card: no variants to choose and not sold out. */
export const simpleProducts = realProducts.filter((p) => p.variants.length === 0 && p.availability !== "sold_out");
if (simpleProducts.length < 3) throw new Error("The tests need at least three simple products (no variants, not sold out).");
export const [simple, simple2, simple3] = simpleProducts as [Product, Product, Product];

/** The test-only product with variants, engraving and three photos (src/data/fixtures.ts). */
export const fixture = products.find((p) => p.fixture && p.variants.length > 1 && p.engraving?.enabled && p.images.length >= 3)!;
if (!fixture) throw new Error("The fixture product is missing: is NEXT_PUBLIC_CATALOG_FIXTURES=1 set?");

export const firstCategory = categories[0]!;
export const nameOf = (product: Product, locale: Locale = "en") => productText(product, locale).name;
export const categoryName = (slug: string, locale: Locale = "en") => categoryText(categories.find((c) => c.slug === slug)!, locale).name;
export const productsIn = (slug: string) => products.filter((p) => p.categories.includes(slug));

/** A price as the site shows it, e.g. price(69) → "$69.00", price(69, "EUR", "de") → "63,48 €". */
export const price = (usd: number, currency: Currency = "USD", locale: Locale = "en") => formatPrice(usd, currency, locale);
export const priceOf = (product: Product, variantId?: string, engraved = false) => unitPriceUsd(product, variantId, engraved);

/** Regex-safe version of a formatted price (Intl inserts no-break spaces). */
export const priceRe = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s/g, "\\s"));

export type TestLine = { slug: string; qty: number; variantId?: string; engraving?: string };

/** Puts lines in the order (v2 storage) and optionally the wishlist, starting from the home page. */
export async function seedCart(page: Page, lines: TestLine[], wishlist?: string[]) {
  await page.goto("/en");
  await page.evaluate(
    ([l, w]) => {
      localStorage.removeItem("gethsemane.cart.v1");
      localStorage.setItem("gethsemane.cart.v2", JSON.stringify(l));
      if (w) localStorage.setItem("gethsemane.wishlist.v1", JSON.stringify(w));
    },
    [lines, wishlist] as const,
  );
}

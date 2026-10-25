import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { fixture, firstCategory, simple } from "./catalog";

export const locales = ["en", "fr", "es", "it", "de", "el", "pl", "ro", "uk", "pt"] as const;

export const pages = {
  home: "",
  shop: "/shop",
  category: `/shop/${firstCategory.slug}`,
  product: `/product/${simple.slug}`,
  /** The test-only product with variants, engraving and a gallery. */
  fixture: `/product/${fixture.slug}`,
  cart: "/cart",
  wishlist: "/wishlist",
  about: "/about",
} as const;

/** The help and policy pages. */
export const infoPages = ["/how-to-order", "/faq", "/shipping", "/returns", "/withdrawal", "/contact", "/privacy", "/terms", "/accessibility", "/care"] as const;

/**
 * Every public page: the sitemap plus the shop, category and product pages, which stay out of the sitemap
 * (noindex) until CATALOG_READY. Catalog links are read from the English shop page.
 */
export async function publicPageUrls(request: APIRequestContext, origin: string): Promise<string[]> {
  const xml = await (await request.get("/sitemap.xml")).text();
  const urls = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!));
  const shop = await (await request.get("/en/shop")).text();
  const catalog = new Set(["/shop", ...[...shop.matchAll(/href="\/en(\/(?:shop\/[a-z-]+|product\/[a-z0-9-]+))"/g)].map((m) => m[1]!)]);
  for (const l of locales) for (const path of catalog) urls.add(`${origin}/${l}${path}`);
  return [...urls];
}

/** Collects console errors, failed requests and CSP violations for the lifetime of the page. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  // CSP violations are reported even when the offending code catches the error itself.
  void page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      console.error(`CSP violation: ${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}`);
    });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("/does-not-exist")) errors.push(`${res.status()} ${res.url()}`);
  });
  return errors;
}

export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "page must not scroll horizontally").toBeLessThanOrEqual(clientWidth);
}

/** Waits until React has hydrated (client-only state such as the cart is then available). */
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => document.querySelector(".lang-fab-button") !== null);
  await page.waitForLoadState("networkidle");
}

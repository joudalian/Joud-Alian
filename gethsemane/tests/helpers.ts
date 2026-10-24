import { expect, type Page } from "@playwright/test";

export const locales = ["en", "fr", "es", "it", "de", "el", "pl", "ro", "uk", "pt"] as const;

export const pages = {
  home: "",
  shop: "/shop",
  category: "/shop/nativity",
  product: "/product/nativity-set-classic",
  cart: "/cart",
  wishlist: "/wishlist",
  about: "/about",
} as const;

/** The help and policy pages. */
export const infoPages = ["/how-to-order", "/faq", "/shipping", "/returns", "/contact", "/privacy", "/terms", "/accessibility", "/care"] as const;

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

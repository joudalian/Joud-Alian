import { expect, test, type Page } from "@playwright/test";
import { fixture, simple } from "./catalog";

// The catalog (every language), its schema and zod stay on the server: the browser receives only the compact,
// already validated data a page needs (src/lib/order-lookup.ts). These checks keep it that way.
test.skip(({ isMobile }) => isMobile, "run once");

const PAGES = ["/en", "/en/shop", "/en/contact", `/en/product/${fixture.slug}`, "/en/cart", "/en/wishlist"];
/** Server-only libraries: the auth library, the database clients, password hashing and the Stripe SDK. */
const SERVER_MARKERS = ["better-auth", "drizzle-orm", "@electric-sql/pglite", "argon2", "api.stripe.com", "stripe-node", "pdf-lib", "PDFDocument", "libvips"];

/** The JavaScript (or CSS) files the page loads from this site. */
async function scriptsOf(page: Page, path: string, type: "script" | "stylesheet" = "script") {
  const bodies: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === type && response.url().startsWith("http://localhost")) bodies.push(response.text());
  });
  await page.goto(path, { waitUntil: "networkidle" });
  return Promise.all(bodies);
}

test("no catalog data, catalog schema or zod in the browser bundles", async ({ page }) => {
  const markers = [
    "_zod", // zod internals
    "Invalid catalog data", // src/lib/catalog.ts
    "launchReady", // a schema-only field
    fixture.text.en.description,
    fixture.text.de!.description,
    simple.text.en.description,
  ];
  for (const path of PAGES) {
    const scripts = await scriptsOf(page, path);
    expect(scripts.length, path).toBeGreaterThan(0);
    for (const marker of markers) {
      expect(scripts.filter((js) => js.includes(marker)).length, `${path}: "${marker}" in a script`).toBe(0);
    }
  }
});

test("marketing and catalog pages load no auth, database or payment code, and no account styles", async ({ page }) => {
  for (const path of PAGES) {
    const scripts = await scriptsOf(page, path);
    for (const marker of SERVER_MARKERS) {
      expect(scripts.filter((js) => js.includes(marker)).length, `${path}: "${marker}" in a script`).toBe(0);
    }
    const styles = await scriptsOf(page, path, "stylesheet");
    expect(styles.length, path).toBeGreaterThan(0);
    expect(styles.filter((css) => css.includes(".account-layout")).length, `${path}: account styles`).toBe(0);
  }
  // The account pages run their forms as server actions: the auth library stays on the server there too.
  for (const path of ["/en/login", "/en/signup", "/en/track-order"]) {
    const scripts = await scriptsOf(page, path);
    for (const marker of SERVER_MARKERS) expect(scripts.filter((js) => js.includes(marker)).length, `${path}: "${marker}"`).toBe(0);
  }
});

test("with every optional feature on, marketing pages still load no server code", async ({ page }) => {
  // Port 3102 runs the same build with FEATURES all on (playwright.config.ts).
  const ON = "http://localhost:3102";
  for (const path of ["/en", "/en/shop?q=cross", `/en/product/${fixture.slug}`, "/en/cart", "/en/wishlist", "/en/christmas", "/en/bulk-orders", "/en/care"]) {
    const scripts = await scriptsOf(page, `${ON}${path}`);
    for (const marker of SERVER_MARKERS) expect(scripts.filter((js) => js.includes(marker)).length, `${path}: "${marker}"`).toBe(0);
  }
});

test("the order and wishlist pages get product text in the page language only", async ({ request }) => {
  const de = fixture.text.de!;
  for (const path of ["/en/cart", "/en/wishlist"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).toContain(JSON.stringify(fixture.text.en.name).slice(1, -1));
    expect(html, path).not.toContain(de.name);
    expect(html, path).not.toContain(fixture.text.en.description);
  }
  const html = await (await request.get("/de/cart")).text();
  expect(html).toContain(de.name);
  expect(html).not.toContain(de.description);
});

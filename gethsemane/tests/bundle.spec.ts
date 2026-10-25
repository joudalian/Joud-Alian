import { expect, test, type Page } from "@playwright/test";
import { fixture, simple } from "./catalog";

// The catalog (every language), its schema and zod stay on the server: the browser receives only the compact,
// already validated data a page needs (src/lib/order-lookup.ts). These checks keep it that way.
test.skip(({ isMobile }) => isMobile, "run once");

const PAGES = ["/en", "/en/contact", `/en/product/${fixture.slug}`, "/en/cart", "/en/wishlist"];

/** The JavaScript files the page loads from this site. */
async function scriptsOf(page: Page, path: string) {
  const bodies: Promise<string>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "script" && response.url().startsWith("http://localhost")) bodies.push(response.text());
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

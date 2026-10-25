import { expect, test } from "@playwright/test";
import { nameOf, price, priceOf, simple2 } from "./catalog";
import { expectNoHorizontalScroll, pages, waitForHydration, watchErrors } from "./helpers";

for (const [name, path] of Object.entries(pages)) {
  test(`${name} page renders without errors`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(`/en${path}`);
    expect(response?.status()).toBe(200);
    await waitForHydration(page);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator("footer.site-footer")).toBeAttached();
    await expectNoHorizontalScroll(page);
    // Every image has an alt attribute and actually loaded.
    // Every image has an alt attribute: empty only where a visible heading or link already names it.
    for (const img of await page.locator("img").all()) {
      expect(await img.getAttribute("alt"), await img.getAttribute("src") ?? "").not.toBeNull();
    }
    if (name === "product") await expect(page.locator(".product-detail .media img")).toHaveAttribute("alt", /olive wood/i);
    if (name === "home") await expect(page.locator(".hero-bg")).toHaveAttribute("alt", /olive trees/i);
    await page.evaluate(async () => {
      for (const img of Array.from(document.images)) img.loading = "eager";
      await Promise.all(Array.from(document.images).map((img) => (img.complete ? null : new Promise((r) => img.addEventListener("load", r, { once: true })))));
    });
    const broken = await page.evaluate(() => Array.from(document.images).filter((i) => i.naturalWidth === 0).map((i) => i.currentSrc));
    expect(broken).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("unknown page shows the localized 404 with status 404", async ({ page }) => {
  const response = await page.goto("/fr/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Ce chemin s'est égaré.");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("unknown product returns 404", async ({ page }) => {
  const response = await page.goto("/de/product/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Dieser Weg hat sich verlaufen.");
});

test("product page has title, price and buy buttons", async ({ page }) => {
  await page.goto(`/en/product/${simple2.slug}`);
  await expect(page.locator("h1")).toHaveText(nameOf(simple2));
  await expect(page.getByTestId("product-price")).toHaveText(price(priceOf(simple2)));
  await expect(page.locator(".buy-row").getByRole("button", { name: "Add to order" })).toBeVisible();
  await expect(page).toHaveTitle(`${nameOf(simple2)} · Gethsemane`);
});

test("brand: header and footer use the logo mark file, icons and manifest resolve", async ({ page, request }) => {
  await page.goto("/el");
  const headerMark = page.locator(".site-header img.logo-mark");
  await expect(headerMark).toHaveAttribute("src", "/brand/gethsemane-mark.svg");
  await expect(page.locator(".site-footer img.logo-mark")).toHaveAttribute("src", "/brand/gethsemane-mark.svg");
  // The mark is never inlined (its clipPath id must stay unique on the page).
  expect(await page.locator("svg clipPath").count()).toBe(0);
  await expect(page.locator(".site-header .logo-name")).toHaveText("GETHSEMANE");
  await expect(page.locator(".site-footer .logo-tagline")).toHaveText("OLIVE WOOD · HOLY LAND");
  const box = (await page.locator(".site-header .logo").boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);

  const icons = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]').evaluateAll((els) =>
    els.map((e) => (e as HTMLLinkElement).getAttribute("href")!),
  );
  for (const href of ["/icons/favicon-16.png", "/icons/favicon-32.png", "/icons/favicon-48.png", "/icons/apple-touch-icon.png", "/manifest.webmanifest"]) {
    expect(icons.some((h) => h.startsWith(href))).toBe(true);
  }
  for (const href of icons) expect((await request.get(href)).status()).toBe(200);
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toContain("Gethsemane");
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512"]);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
  expect((await request.get("/favicon.ico")).status()).toBe(200);

  const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
  expect(og).toMatch(/\/brand\/og-image\.png$/);
  expect((await request.get(og!)).status()).toBe(200);
  await expect(page.locator('meta[property="og:image:width"]').first()).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]').first()).toHaveAttribute("content", "630");
  await expect(page.locator('meta[name="twitter:image"]').first()).toHaveAttribute("content", /\/brand\/og-image\.png$/);
});

test("Our Story shows the full emblem with its description", async ({ page }) => {
  await page.goto("/en/about");
  const emblem = page.getByRole("img", { name: "Gethsemane logo: an ancient olive tree and olive press inside an arch, topped by a cross" });
  await expect(emblem).toBeVisible();
  await expect(emblem).toHaveAttribute("width", "1024");
  await expect(emblem).toHaveAttribute("height", "1024");
  expect(await emblem.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
});

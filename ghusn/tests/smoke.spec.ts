import { expect, test } from "@playwright/test";
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
    for (const img of await page.locator("img").all()) {
      await expect(img).toHaveAttribute("alt", /.+/);
    }
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
  await expect(page.locator("h1")).toHaveText("Page introuvable");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("unknown product returns 404", async ({ page }) => {
  const response = await page.goto("/de/product/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.locator("h1")).toHaveText("Seite nicht gefunden");
});

test("product page has title, price and buy buttons", async ({ page }) => {
  await page.goto("/en/product/jerusalem-cross");
  await expect(page.locator("h1")).toHaveText("Jerusalem Cross");
  await expect(page.locator(".product-detail .product-price")).toHaveText("$39.00");
  await expect(page.locator(".buy-row").getByRole("button", { name: "Add to cart" })).toBeVisible();
  await expect(page).toHaveTitle("Jerusalem Cross · Ghusn");
});

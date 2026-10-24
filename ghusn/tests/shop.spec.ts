import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";

test("currency switch updates prices everywhere and is rendered by the server after reload", async ({ page, request }) => {
  await page.goto("/en/shop");
  await waitForHydration(page);
  const firstPrice = page.locator(".product-card .price").first();
  await expect(firstPrice).toHaveText("$89.00");
  const scrollBefore = await page.evaluate(() => {
    window.scrollTo(0, 400);
    return window.scrollY;
  });
  await page.locator("#currency-select").selectOption("EUR");
  await expect(firstPrice).toHaveText("€81.88");
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  expect(new URL(page.url()).pathname).toBe("/en/shop");

  // The server renders the chosen currency, so there is no flash of USD on the next page.
  const cookies = await page.context().cookies();
  const currency = cookies.find((c) => c.name === "currency");
  expect(currency?.value).toBe("EUR");
  const html = await (await request.get("/de/shop", { headers: { cookie: "currency=EUR" } })).text();
  expect(html).toMatch(/81,88\s€/);
  expect(html).not.toContain("$89.00");

  await page.goto("/fr/product/nativity-set-classic");
  await expect(page.locator(".product-detail .product-price")).toHaveText(/81,88\s€/);
});

test("tampered currency cookie and storage fall back to USD", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "currency", value: "XYZ\"><img>", url: baseURL! }]);
  await page.goto("/en/shop");
  await expect(page.locator(".product-card .price").first()).toHaveText("$89.00");
});

test("add to cart, change quantity, remove, and see the empty state", async ({ page, isMobile }) => {
  await page.goto("/en/product/salad-bowl");
  await waitForHydration(page);
  const buy = page.locator(".buy-row");
  await buy.getByRole("button", { name: "Add to cart" }).click();
  await expect(buy.getByRole("status")).toHaveText("Added to cart");
  await buy.getByRole("button", { name: "Added to cart" }).click();

  const cartLink = isMobile ? page.locator(".bottom-nav a[href='/en/cart']") : page.locator(".header-actions a[href='/en/cart']");
  await expect(cartLink).toHaveAttribute("aria-label", "Cart, 2 items");
  await cartLink.click();
  await page.waitForURL("**/en/cart");

  await expect(page.locator(".line")).toHaveCount(1);
  await expect(page.locator(".line output")).toHaveText("2");
  await expect(page.locator(".subtotal")).toHaveText("$138.00");
  await page.getByRole("button", { name: "Increase quantity of Salad Bowl" }).click();
  await expect(page.locator(".subtotal")).toHaveText("$207.00");
  await page.getByRole("button", { name: "Decrease quantity of Salad Bowl" }).click();
  await expect(page.locator(".line output")).toHaveText("2");

  // Survives a reload.
  await page.reload();
  await expect(page.locator(".line output")).toHaveText("2");

  await page.getByRole("button", { name: "Remove Salad Bowl from cart" }).click();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue shopping" })).toBeVisible();
});

test("wishlist toggle, wishlist page, move to cart and empty state", async ({ page }) => {
  await page.goto("/en/shop/rosaries");
  await waitForHydration(page);
  const heart = page.getByRole("button", { name: "Add Olive Wood Rosary to wishlist" });
  await heart.click();
  const pressed = page.getByRole("button", { name: "Remove Olive Wood Rosary from wishlist" });
  await expect(pressed).toHaveAttribute("aria-pressed", "true");

  await page.goto("/en/wishlist");
  await expect(page.locator(".line h2")).toHaveText(["Olive Wood Rosary"]);
  await page.getByRole("button", { name: "Move to cart" }).click();
  await expect(page.getByRole("heading", { name: "Your wishlist is empty" })).toBeVisible();

  await page.goto("/en/cart");
  await expect(page.locator(".line h2")).toHaveText(["Olive Wood Rosary"]);
});

test("empty states are translated", async ({ page }) => {
  await page.goto("/uk/cart");
  await expect(page.getByRole("heading", { name: "Ваш кошик порожній" })).toBeVisible();
  await page.goto("/el/wishlist");
  await expect(page.getByRole("heading", { name: "Η λίστα αγαπημένων σας είναι άδεια" })).toBeVisible();
});

test("tampered or oversized localStorage is sanitized", async ({ page }) => {
  await page.goto("/en");
  await page.evaluate(() => {
    localStorage.setItem(
      "ghusn.cart.v1",
      JSON.stringify([
        { slug: "salad-bowl", qty: 3 },
        { slug: "<img src=x onerror=alert(1)>", qty: 1 },
        { slug: "serving-board", qty: 999 },
        { slug: "salad-bowl", qty: 19 },
        { slug: "jerusalem-cross", qty: -2 },
      ]),
    );
    localStorage.setItem("ghusn.wishlist.v1", "{not json");
    localStorage.setItem("ghusn.currency.v1", "BTC");
  });
  await page.goto("/en/cart");
  // The whole cart is rejected because it violates the schema (qty out of range); nothing unsafe renders.
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem(
      "ghusn.cart.v1",
      JSON.stringify([
        { slug: "salad-bowl", qty: 3 },
        { slug: "unknown-product", qty: 1 },
        { slug: "salad-bowl", qty: 19 },
      ]),
    );
    localStorage.setItem("ghusn.wishlist.v1", JSON.stringify(["salad-bowl", "salad-bowl", "nope", 42]));
  });
  await page.reload();
  await expect(page.locator(".line")).toHaveCount(1);
  await expect(page.locator(".line output")).toHaveText("20"); // merged and capped at the maximum
  await page.goto("/en/wishlist");
  await expect(page.getByRole("heading", { name: "Your wishlist is empty" })).toBeVisible();

  await page.evaluate(() => localStorage.setItem("ghusn.wishlist.v1", JSON.stringify(["salad-bowl", "salad-bowl", "nope"])));
  await page.reload();
  await expect(page.locator(".line")).toHaveCount(1);

  await page.evaluate(() => localStorage.setItem("ghusn.cart.v1", "x".repeat(100_000)));
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
});

function decodeWhatsApp(href: string | null) {
  expect(href).not.toBeNull();
  const url = new URL(href!);
  expect(url.origin + url.pathname).toBe("https://wa.me/970569741193");
  return url.searchParams.get("text") ?? "";
}

test("cart orders via WhatsApp with items, quantities, currency and total in the page language", async ({ page }) => {
  await page.goto("/de");
  await page.evaluate(() =>
    localStorage.setItem("ghusn.cart.v1", JSON.stringify([{ slug: "salad-bowl", qty: 2 }, { slug: "jerusalem-cross", qty: 1 }])),
  );
  await page.goto("/de/cart");
  await waitForHydration(page);
  await page.locator("#currency-select").selectOption("EUR");
  const link = page.getByRole("link", { name: /Über WhatsApp bestellen/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const text = decodeWhatsApp(await link.getAttribute("href"));
  expect(text).toContain("Hallo Ghusn, ich möchte Folgendes bestellen:");
  expect(text).toMatch(/2 × Salatschüssel — 126,96\s€/);
  expect(text).toMatch(/1 × Jerusalemkreuz — 35,88\s€/);
  expect(text).toMatch(/Gesamt: 162,84\s€/);
  expect(text).toContain("Währung: EUR");
  expect(text).toContain("— Ghusn");
  expect(text).not.toContain("$");

  // The message follows quantity changes.
  await page.getByRole("button", { name: "Menge von Jerusalemkreuz erhöhen" }).click();
  await expect.poll(async () => decodeWhatsApp(await link.getAttribute("href"))).toMatch(/2 × Jerusalemkreuz/);
});

test("product page orders a single piece via WhatsApp", async ({ page }) => {
  await page.goto("/fr/product/rosary-olive-wood");
  await waitForHydration(page);
  const link = page.getByRole("link", { name: /Commander via WhatsApp/ });
  await expect(link).toBeVisible();
  const text = decodeWhatsApp(await link.getAttribute("href"));
  expect(text).toContain("Bonjour Ghusn");
  expect(text).toMatch(/1 × Chapelet en bois d'olivier — 24,00\s\$US/);
  expect(text).toContain("Devise : USD");
});

test("an empty cart has no WhatsApp button", async ({ page }) => {
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  await expect(page.getByTestId("whatsapp-order")).toHaveCount(0);
});

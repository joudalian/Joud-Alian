import { expect, test } from "@playwright/test";
import { fromPriceUsd } from "../src/lib/catalog";
import { categoryName, nameOf, price, priceOf, priceRe, products, productsIn, seedCart, simple, simple2 } from "./catalog";
import { waitForHydration } from "./helpers";

const firstCard = products[0]!;
const firstUsd = fromPriceUsd(firstCard);

test("currency switch updates prices everywhere and is rendered by the server after reload", async ({ page, request }) => {
  await page.goto("/en/shop");
  await waitForHydration(page);
  const firstPrice = page.locator(".product-card .price").first();
  await expect(firstPrice).toHaveText(price(firstUsd));
  const scrollBefore = await page.evaluate(() => {
    window.scrollTo(0, 400);
    return window.scrollY;
  });
  await page.locator("#currency-select").selectOption("EUR");
  await expect(firstPrice).toHaveText(price(firstUsd, "EUR"));
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  expect(new URL(page.url()).pathname).toBe("/en/shop");

  // The server renders the chosen currency, so there is no flash of USD on the next page.
  const cookies = await page.context().cookies();
  const currency = cookies.find((c) => c.name === "currency");
  expect(currency?.value).toBe("EUR");
  const html = await (await request.get("/de/shop", { headers: { cookie: "currency=EUR" } })).text();
  expect(html).toMatch(priceRe(price(firstUsd, "EUR", "de")));
  expect(html).not.toContain(price(firstUsd));

  await page.goto(`/fr/product/${simple.slug}`);
  await expect(page.getByTestId("product-price")).toHaveText(priceRe(price(priceOf(simple), "EUR", "fr")));
});

test("tampered currency cookie and storage fall back to USD", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "currency", value: "XYZ\"><img>", url: baseURL! }]);
  await page.goto("/en/shop");
  await expect(page.locator(".product-card .price").first()).toHaveText(price(firstUsd));
});

test("add to cart, change quantity, remove, and see the empty state", async ({ page, isMobile }) => {
  const name = nameOf(simple);
  await page.goto(`/en/product/${simple.slug}`);
  await waitForHydration(page);
  const buy = page.locator(".buy-row");
  await buy.getByRole("button", { name: "Add to order" }).click();
  await expect(page.getByTestId("live-region")).toHaveText(`${name} added to your order.`);
  await buy.getByRole("button", { name: "Added to your order" }).click();

  const cartLink = isMobile ? page.locator(".bottom-nav a[href='/en/cart']") : page.locator(".header-actions a[href='/en/cart']");
  await expect(cartLink).toHaveAttribute("aria-label", "Your order, 2 items");
  await cartLink.click();
  await page.waitForURL("**/en/cart");

  await expect(page.locator(".line")).toHaveCount(1);
  await expect(page.locator(".line input[type=number]")).toHaveValue("2");
  await expect(page.locator(".subtotal-usd")).toHaveText(price(priceOf(simple) * 2));
  await page.getByRole("button", { name: `Increase quantity of ${name}` }).click();
  await expect(page.locator(".subtotal-usd")).toHaveText(price(priceOf(simple) * 3));
  await page.getByRole("button", { name: `Decrease quantity of ${name}` }).click();
  await expect(page.locator(".line input[type=number]")).toHaveValue("2");

  // Survives a reload.
  await page.reload();
  await expect(page.locator(".line input[type=number]")).toHaveValue("2");

  await page.getByRole("button", { name: `Remove ${name} from your order` }).click();
  await expect(page.getByRole("heading", { name: "Your order is empty." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to the shop" })).toBeVisible();
});

test("wishlist toggle, wishlist page, move to cart and empty state", async ({ page }) => {
  const category = simple2.categories[0]!;
  const name = nameOf(simple2);
  await page.goto(`/en/shop/${category}`);
  await waitForHydration(page);
  await expect(page.locator("h1")).toHaveText(categoryName(category));
  await expect(page.locator(".product-card")).toHaveCount(productsIn(category).length);
  const heart = page.getByRole("button", { name: `Add ${name} to wishlist` });
  await heart.click();
  const pressed = page.getByRole("button", { name: `Remove ${name} from wishlist` });
  await expect(pressed).toHaveAttribute("aria-pressed", "true");

  await page.goto("/en/wishlist");
  await expect(page.locator(".line h2")).toHaveText([name]);
  await page.getByRole("button", { name: "Move to order" }).click();
  await expect(page.getByRole("heading", { name: "Your wishlist is empty" })).toBeVisible();

  await page.goto("/en/cart");
  await expect(page.locator(".line h2")).toHaveText([name]);
});

test("empty states are translated", async ({ page }) => {
  await page.goto("/uk/cart");
  await expect(page.getByRole("heading", { name: "Ваше замовлення порожнє." })).toBeVisible();
  await page.goto("/el/wishlist");
  await expect(page.getByRole("heading", { name: "Η λίστα αγαπημένων σας είναι άδεια" })).toBeVisible();
});

test("tampered or oversized localStorage is sanitized", async ({ page }) => {
  const [a, b] = [simple.slug, simple2.slug];
  await page.goto("/en");
  await page.evaluate(([a, b]) => {
    localStorage.setItem(
      "gethsemane.cart.v2",
      JSON.stringify([
        { slug: a, qty: 3 },
        { slug: "<img src=x onerror=alert(1)>", qty: 1 },
        { slug: b, qty: 999 },
        { slug: a, qty: 19 },
        { slug: b, qty: -2 },
      ]),
    );
    localStorage.setItem("gethsemane.wishlist.v1", "{not json");
    localStorage.setItem("gethsemane.currency.v1", "BTC");
  }, [a, b]);
  await page.goto("/en/cart");
  // The whole cart is rejected because it violates the schema (qty out of range); nothing unsafe renders.
  await expect(page.getByRole("heading", { name: "Your order is empty." })).toBeVisible();

  await page.evaluate((a) => {
    localStorage.setItem(
      "gethsemane.cart.v2",
      JSON.stringify([
        { slug: a, qty: 3 },
        { slug: "unknown-product", qty: 1 },
        { slug: a, qty: 19 },
      ]),
    );
    localStorage.setItem("gethsemane.wishlist.v1", JSON.stringify([a, a, "nope", 42]));
  }, a);
  await page.reload();
  // The unknown piece stays listed as no longer available (with a remove button); the rest is merged and capped.
  await expect(page.locator(".line")).toHaveCount(2);
  await expect(page.getByTestId("line-unavailable")).toHaveCount(1);
  await expect(page.locator(".line input[type=number]")).toHaveValue("20");
  await page.getByTestId("line-unavailable").getByRole("button", { name: /Remove/ }).click();
  await expect(page.locator(".line")).toHaveCount(1);
  await page.goto("/en/wishlist");
  await expect(page.getByRole("heading", { name: "Your wishlist is empty" })).toBeVisible();

  await page.evaluate((a) => localStorage.setItem("gethsemane.wishlist.v1", JSON.stringify([a, a, "nope"])), a);
  await page.reload();
  await expect(page.locator(".line")).toHaveCount(1);

  await page.evaluate(() => localStorage.setItem("gethsemane.cart.v2", "x".repeat(100_000)));
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Your order is empty." })).toBeVisible();
});

function decodeWhatsApp(href: string | null) {
  expect(href).not.toBeNull();
  const url = new URL(href!);
  expect(url.origin + url.pathname).toBe("https://wa.me/970569741193");
  return url.searchParams.get("text") ?? "";
}

test("cart orders via WhatsApp with items, quantities, currency and total in the page language", async ({ page }) => {
  await seedCart(page, [
    { slug: simple.slug, qty: 2 },
    { slug: simple2.slug, qty: 1 },
  ]);
  await page.goto("/de/cart");
  await waitForHydration(page);
  await page.locator("#currency-select").selectOption("EUR");
  const link = page.getByRole("link", { name: /Bestellung auf WhatsApp senden/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const text = decodeWhatsApp(await link.getAttribute("href"));
  expect(text).toContain("Hallo Gethsemane, ich möchte Folgendes bestellen:");
  const total = priceOf(simple) * 2 + priceOf(simple2);
  expect(text).toMatch(priceRe(`2 × ${nameOf(simple, "de")} — ${price(priceOf(simple) * 2, "EUR", "de")}`));
  expect(text).toMatch(priceRe(`1 × ${nameOf(simple2, "de")} — ${price(priceOf(simple2), "EUR", "de")}`));
  expect(text).toMatch(priceRe(`Summe (EUR, ungefähr): ${price(total, "EUR", "de")}`));
  expect(text).toMatch(priceRe(`Summe in USD: ${price(total, "USD", "de")}`));
  expect(text).toContain("Gewählte Währung: EUR");
  expect(text).toContain("— Gethsemane");

  // The message follows quantity changes.
  await page.getByRole("button", { name: `Menge von ${nameOf(simple2, "de")} erhöhen` }).click();
  await expect.poll(async () => decodeWhatsApp(await link.getAttribute("href"))).toContain(`2 × ${nameOf(simple2, "de")}`);
});

test("product page orders a single piece via WhatsApp", async ({ page }) => {
  await page.goto(`/fr/product/${simple2.slug}`);
  await waitForHydration(page);
  const link = page.getByRole("link", { name: /Commander seulement cette pièce/ });
  await expect(link).toBeVisible();
  const text = decodeWhatsApp(await link.getAttribute("href"));
  expect(text).toContain("Bonjour Gethsemane");
  expect(text).toMatch(priceRe(`1 × ${nameOf(simple2, "fr")} — ${price(priceOf(simple2), "USD", "fr")} (${nameOf(simple2)}, ${simple2.sku})`));
  expect(text).toMatch(/Devise choisie\s:\sUSD/);
  expect(text).toContain("Site language: Français (fr)");
});

test("an empty cart has no WhatsApp button", async ({ page }) => {
  await page.goto("/en/cart");
  await expect(page.getByRole("heading", { name: "Your order is empty." })).toBeVisible();
  await expect(page.getByTestId("whatsapp-order")).toHaveCount(0);
});

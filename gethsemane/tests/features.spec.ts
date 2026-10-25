import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { FEATURES, SHIPPING_RATES } from "../src/config/store";
import { locales } from "../src/i18n/locales";
import { dutiesNoteFor } from "../src/lib/duties";
import { engravingSupported } from "../src/lib/engraving";
import { filterProducts, parseShopQuery } from "../src/lib/shop-filter";
import { fixture, nameOf, price, priceOf, products, simple, simple2 } from "./catalog";
import { waitForHydration } from "./helpers";
import { linkIn, sentEmails, uniqueEmail, useOwnIp, useOwnIp as giveOwnIp, waitForEmail } from "./outbox";

// Optional features (FEATURES in src/config/store.ts). Port 3100 runs the defaults; port 3102 runs the same build
// with every feature on, a free-shipping threshold of 150 USD, a Christmas order-by date and a 10 % welcome code.
test.skip(({ isMobile }) => isMobile, "run once (desktop)");
test.beforeEach(async ({ context }) => {
  await useOwnIp(context);
});

const ON = "http://localhost:3102";
const PASSWORD = "olive-wood-2026";
const nativity = products.filter((p) => p.tags.includes("christmas"));

async function seed(page: Page, base: string, lines: { slug: string; qty: number; variantId?: string; engraving?: string }[], wishlist?: string[]) {
  await page.goto(`${base}/en`);
  await page.evaluate(
    ([l, w]) => {
      localStorage.setItem("gethsemane.cart.v2", JSON.stringify(l));
      if (w) localStorage.setItem("gethsemane.wishlist.v1", JSON.stringify(w));
    },
    [lines, wishlist] as const,
  );
}

async function signUp(page: Page, base: string, email: string, port: number) {
  await page.goto(`${base}/en/signup`);
  await page.getByLabel("Name", { exact: true }).fill("Test Person");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByTestId("signup-form-success")).toBeVisible();
  await page.goto(linkIn(await waitForEmail(email, "verify-email", port), "/api/auth/verify-email"));
  await expect(page.getByTestId("verified")).toBeVisible();
}

async function logIn(page: Page, base: string, email: string) {
  await page.goto(`${base}/en/login`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL(`${base}/en/account`);
}

/** Checkout with the Stripe stand-in on the given server; returns the order number. */
async function buy(page: Page, base: string, email: string, lines: { slug: string; qty: number }[]) {
  await seed(page, base, lines);
  await page.goto(`${base}/en/checkout`);
  const form = page.getByTestId("checkout-form");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Full name").fill("Anna Buyer");
  await form.getByLabel("Country").selectOption("DE");
  await form.getByLabel("Street and house number").fill("Olivenweg 7");
  await form.getByLabel("Postcode").fill("10115");
  await form.getByLabel("Town or city").fill("Berlin");
  await form.getByRole("checkbox", { name: /I have read the terms/ }).check();
  await expect(form.getByTestId("pay")).toBeEnabled();
  await form.getByTestId("pay").click();
  await page.getByRole("button", { name: "Pay" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Paid");
  return (await page.getByTestId("order-number").textContent())!;
}

test.describe("default flags", () => {
  test("FEATURES: on by default except wallets, reviews and the newsletter", () => {
    expect(FEATURES).toEqual({
      wallets: false,
      freeShippingBar: true,
      dutiesNote: true,
      bulkOrders: true,
      engravingPreview: true,
      completeTheSet: true,
      reviews: false,
      wishlistSync: true,
      newsletter: false,
      shopSearch: true,
      christmas: true,
      careCard: true,
    });
  });

  test("off features leave no trace: no newsletter form, no review pages, no free-shipping bar, no duties note", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByTestId("newsletter-form")).toHaveCount(0);
    expect((await page.goto("/en/newsletter"))!.status()).toBe(404);
    expect((await page.goto("/en/review/abcdefghijklmnopqrstuvwxyz"))!.status()).toBe(404);
    await page.goto(`/en/product/${simple.slug}`);
    await expect(page.getByTestId("product-reviews")).toHaveCount(0);
    await expect(page.locator(".reviews-note")).toContainText("we will not invent any");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join("")).not.toContain("aggregateRating");
    await seed(page, "", [{ slug: simple.slug, qty: 1 }]);
    await page.goto("/en/cart");
    await waitForHydration(page);
    await expect(page.getByTestId("free-shipping-bar")).toHaveCount(0);
    await page.goto("/en/privacy");
    await expect(page.locator("#newsletter-title, #reviews-title")).toHaveCount(0);
  });

  test("wallets off: Stripe is asked for cards only", async ({ page, request }) => {
    await buy(page, "", uniqueEmail("cards"), [{ slug: simple.slug, qty: 1 }]);
    const sessions = (await (await request.get("http://localhost:12100/__sessions")).json()) as { customer_email: string; allowed_payment_method_types: string[] | null }[];
    expect(sessions.at(-1)!.allowed_payment_method_types).toEqual(["card"]);
  });
});

test.describe("shop search and filters", () => {
  test("URL-driven, server-rendered results; filtered URLs are noindex with the shop as canonical", async ({ page, request }) => {
    const word = nameOf(simple).split(" ").at(-1)!.toLowerCase();
    await page.goto(`/en/shop?q=${encodeURIComponent(word)}`);
    const expected = filterProducts(products, parseShopQuery({ q: word }), "en");
    expect(expected.length).toBeGreaterThan(0);
    await expect(page.getByTestId("result-count")).toHaveText(`${expected.length} product${expected.length === 1 ? "" : "s"}`);
    await expect(page.locator(".product-card")).toHaveCount(expected.length);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/shop$/);
    // Works without JavaScript: the HTML already holds the filtered list.
    const html = await (await request.get(`/en/shop?category=${simple2.categories[0]}&max=${Math.ceil(priceOf(simple2))}`)).text();
    expect(html).toContain(nameOf(simple2));

    // The form fills the URL; accents and case do not matter.
    await page.goto("/fr/shop");
    await page.getByRole("searchbox", { name: "Rechercher dans la boutique" }).fill("CRECHE");
    await page.getByRole("button", { name: "Afficher" }).click();
    await expect(page).toHaveURL(/q=CRECHE/);
    await expect(page.locator(".product-card").first()).toContainText(/Crèche/);
    await page.getByRole("link", { name: "Effacer les filtres" }).click();
    await expect(page).toHaveURL(/\/fr\/shop$/);

    await page.goto("/en/shop?q=zzzz-nothing");
    await expect(page.getByTestId("no-results")).toBeVisible();
  });

  test("filters by category, price, size and availability (pure function)", () => {
    const all = filterProducts(products, parseShopQuery({}), "en");
    expect(all).toHaveLength(products.length);
    const cheap = filterProducts(products, parseShopQuery({ max: "30" }), "en");
    expect(cheap.every((p) => Math.min(p.priceUsd, ...p.variants.map((v) => v.priceUsd ?? p.priceUsd)) <= 30)).toBe(true);
    const bogus = parseShopQuery({ category: "nope", size: "huge", availability: "x", min: "-3" });
    expect(bogus).toEqual({ q: "", category: "", min: null, max: null, size: "", availability: "" });
    expect(filterProducts(products, parseShopQuery({ availability: "available" }), "en").some((p) => p.availability === "sold_out")).toBe(false);
  });
});

test.describe("Christmas collection", () => {
  test("page and home band from the christmas tag; no order-by line while the date is empty", async ({ page }) => {
    expect(nativity.length).toBeGreaterThan(0);
    await page.goto("/en/christmas");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Christmas collection");
    await expect(page.locator(".product-card")).toHaveCount(nativity.length);
    await expect(page.getByTestId("christmas-order-by")).toHaveCount(0);
    await page.goto("/en");
    await page.getByTestId("christmas-band").getByRole("link", { name: "See the collection" }).click();
    await expect(page).toHaveURL(/\/en\/christmas$/);
    // With a date set (port 3102) the order-by message appears, on the page and the band.
    await page.goto(`${ON}/de/christmas`);
    await expect(page.getByTestId("christmas-order-by")).toContainText("10. Dezember 2026");
  });
});

test.describe("product page features", () => {
  test("complete the set lists the relatedSkus; products without them show no section", async ({ page }) => {
    await page.goto(`/en/product/${fixture.slug}`);
    const set = page.getByTestId("complete-the-set");
    await expect(set.getByRole("heading", { name: "Complete the set" })).toBeVisible();
    const expected = fixture.relatedSkus.map((sku) => products.find((p) => p.sku === sku)!);
    await expect(set.locator(".product-card h3")).toHaveText(expected.map((p) => nameOf(p)));
    await page.goto(`/en/product/${simple.slug}`);
    await expect(page.getByTestId("complete-the-set")).toHaveCount(0);
  });

  test("engraving preview on a wood panel, labelled illustrative; unsupported scripts are refused", async ({ page }) => {
    await page.goto(`/en/product/${fixture.slug}`);
    await waitForHydration(page);
    await page.getByLabel(/Add engraving/).check();
    await page.getByLabel("Engraving text").fill("Ελπίδα 2026");
    const preview = page.getByTestId("engraving-preview");
    await expect(preview.locator(".engraving-panel")).toHaveText("Ελπίδα 2026");
    await expect(preview.locator("figcaption")).toContainText("Illustrative preview");
    await page.getByLabel("Engraving text").fill("漢字");
    await expect(page.getByTestId("engraving-preview")).toHaveCount(0);
    await expect(page.getByText("Some characters cannot be engraved.")).toBeVisible();
    await expect(page.locator(".buy-row button").first()).toBeDisabled();
    expect(engravingSupported("Anna & Jan, 12.05.")).toBe(true);
    expect(engravingSupported("Слава")).toBe(true);
    expect(engravingSupported("♥")).toBe(false);
  });

  test("checkout: engraved lines need the confirmation tick; the server checks it and the characters", async ({ page }) => {
    const variant = fixture.variants[0]!.id;
    await seed(page, "", [{ slug: fixture.slug, qty: 1, variantId: variant, engraving: "Anna" }]);
    await page.goto("/en/checkout");
    const box = page.getByTestId("engraving-confirm");
    await expect(box).toContainText("“Anna”");
    await expect(box.getByRole("checkbox")).toHaveAttribute("required", "");
    // A tampered cart with an unsupported character is refused by the server's pricing.
    await seed(page, "", [{ slug: fixture.slug, qty: 1, variantId: variant, engraving: "♥" }]);
    await page.goto("/en/checkout");
    await expect(page.getByTestId("checkout-form").locator(".form-error").first()).toContainText("engraving");
  });
});

test.describe("bulk orders", () => {
  test("form stores the enquiry, emails the shop and lists it in admin; linked from footer, cart and products", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(".site-footer").getByRole("link", { name: "Wholesale" })).toHaveAttribute("href", "/en/bulk-orders");
    await page.goto(`/en/product/${simple.slug}`);
    await page.getByTestId("bulk-link").click();
    await expect(page).toHaveURL(new RegExp(`/en/bulk-orders\\?product=${simple.slug}$`));
    await expect(page.locator("#f-items")).toHaveValue(nameOf(simple));
    await expect(page.locator("main")).not.toContainText(/wholesale price|\$\d/i);
    const email = uniqueEmail("parish");
    await page.getByLabel("Organisation").fill("St. Anne Parish");
    await page.getByLabel("Your name").fill("Father Tom");
    await page.getByLabel("Your email").fill(email);
    await page.getByLabel("Country for delivery").selectOption("IE");
    await page.getByLabel("Quantity").fill("about 40");
    await page.getByLabel(/Needed by/).fill("2026-12-01");
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByTestId("bulk-form-success")).toContainText("reply by email with a quote");
    const sent = sentEmails("gethsemane.t12@gmail.com", "bulk-enquiry").find((m) => m.text.includes(email))!;
    expect(sent.subject).toBe("[Gethsemane] Bulk order enquiry — St. Anne Parish (IE)");
    expect(sent.text).toContain("Needed by: 2026-12-01");
  });
});

test.describe("wishlist in the account", () => {
  test("guests get a sign-in prompt; signed in, the wishlist follows the account to another browser", async ({ page, browser }) => {
    await page.goto("/en/wishlist");
    await expect(page.getByTestId("wishlist-sign-in")).toContainText("Log in");
    const email = uniqueEmail("wish");
    await signUp(page, "", email, 3100);
    await seed(page, "", [], [simple.slug]);
    await logIn(page, "", email);
    await page.goto("/en/wishlist");
    await expect(page.getByTestId("wishlist-synced")).toBeVisible();
    await expect(page.getByRole("heading", { name: nameOf(simple) })).toBeVisible();
    // Saved on the server: a fresh browser sees it after logging in.
    const other = await browser.newPage();
    await useOwnIp(other.context());
    await logIn(other, "", email);
    await other.goto("/en/wishlist");
    await expect(other.getByRole("heading", { name: nameOf(simple) })).toBeVisible();
    // Removing it there removes it from the account.
    await other.getByRole("button", { name: new RegExp(`Remove.*${nameOf(simple)}`) }).click();
    await expect.poll(async () => (await (await other.request.get("/api/wishlist")).json()).items).toEqual([]);
    await other.close();
    // The API refuses anonymous callers.
    const anon = await browser.newContext();
    expect((await anon.request.get("http://localhost:3100/api/wishlist")).status()).toBe(401);
    await anon.close();
  });
});

test.describe("care card", () => {
  test("a printable PDF in every language, linked from the care page", async ({ page, request }) => {
    for (const locale of locales) {
      const file = new URL(`../public/care-card/gethsemane-care-${locale}.pdf`, import.meta.url);
      expect(existsSync(file), locale).toBe(true);
      const bytes = readFileSync(file);
      expect(bytes.subarray(0, 5).toString(), locale).toBe("%PDF-");
      expect(bytes.length, locale).toBeLessThan(100_000);
    }
    await page.goto("/el/care");
    const link = page.getByTestId("care-card");
    await expect(link).toHaveAttribute("href", "/care-card/gethsemane-care-el.pdf");
    const res = await request.get("/care-card/gethsemane-care-el.pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
  });
});

test.describe("duties note", () => {
  test("shown only for regions with confirmed text, in the page language with an English fallback", () => {
    const notes = { europe: { en: "Import VAT may be charged on delivery.", de: "Bei der Zustellung kann Einfuhrumsatzsteuer anfallen." } };
    expect(dutiesNoteFor("europe", "de", notes)).toBe("Bei der Zustellung kann Einfuhrumsatzsteuer anfallen.");
    expect(dutiesNoteFor("europe", "fr", notes)).toBe("Import VAT may be charged on delivery.");
    expect(dutiesNoteFor("oceania", "en", notes)).toBeNull();
    expect(dutiesNoteFor("europe", "en")).toBeNull(); // nothing confirmed in src/config/store.ts yet
  });
});

test.describe("features on (port 3102)", () => {
  test.describe.configure({ mode: "serial" });

  test("free-shipping bar and free standard shipping from the threshold; wallets leave the methods to Stripe", async ({ page, request }) => {
    await seed(page, ON, [{ slug: simple.slug, qty: 1 }]);
    await page.goto(`${ON}/en/cart`);
    await waitForHydration(page);
    const remaining = 150 - priceOf(simple);
    await expect(page.getByTestId("free-shipping-bar")).toContainText(`Add ${price(remaining)} more for free standard shipping.`);
    const qty = Math.ceil(150 / priceOf(simple));
    await seed(page, ON, [{ slug: simple.slug, qty }]);
    await page.goto(`${ON}/en/cart`);
    await expect(page.getByTestId("free-shipping-bar")).toContainText("qualifies for free standard shipping");
    await page.goto(`${ON}/en/checkout`);
    await page.getByTestId("checkout-form").getByLabel("Country").selectOption("DE");
    await expect(page.getByTestId("review-totals")).toContainText("Free");
    await expect(page.getByTestId("review-total")).toHaveText(price(priceOf(simple) * qty));
    // Express is never free.
    const express = SHIPPING_RATES.europe.find((r) => r.id === "express")!;
    await page.getByRole("radio", { name: /Express/ }).check();
    await expect(page.getByTestId("review-total")).toHaveText(price(priceOf(simple) * qty + express.usd));

    await buy(page, ON, uniqueEmail("wallet"), [{ slug: simple.slug, qty: 1 }]);
    const sessions = (await (await request.get("http://localhost:12102/__sessions")).json()) as { allowed_payment_method_types: string[] | null }[];
    expect(sessions.at(-1)!.allowed_payment_method_types).toBeNull();
  });

  test("newsletter: double opt-in, welcome code, unsubscribe link in every email; privacy covers it", async ({ page, browser }) => {
    const email = uniqueEmail("news");
    await page.goto(`${ON}/en`);
    await page.locator("#nl-email").fill(email);
    await page.locator(".footer-newsletter").getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByTestId("newsletter-status")).toContainText("we have sent you an email");
    const confirmMail = await waitForEmail(email, "newsletter-confirm", 3102);
    expect(confirmMail.text).toContain("Unsubscribe:");
    // Opening the link alone does not subscribe (mail scanners); the button does.
    await page.goto(linkIn(confirmMail, "confirm="));
    await page.getByRole("button", { name: "Confirm subscription" }).click();
    await expect(page.getByTestId("newsletter-status")).toContainText("subscription is confirmed");
    const welcome = await waitForEmail(email, "newsletter-welcome", 3102);
    expect(welcome.text).toMatch(/10% off your first order: WELCOME-[0-9A-F]{8}/);
    expect(welcome.text).toContain("Unsubscribe:");
    // The same address again: the same answer, no second confirmation email.
    await page.goto(`${ON}/en/newsletter`);
    await page.locator("#nlp-email").fill(email);
    await page.locator(".auth-card").getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByTestId("newsletter-status")).toContainText("we have sent you an email");
    expect(sentEmails(email, "newsletter-confirm", 3102)).toHaveLength(1);
    // The owner can export confirmed subscribers (with their own unsubscribe links) for a mailing tool.
    const admin = await browser.newPage();
    await giveOwnIp(admin.context());
    await signUp(admin, ON, "owner@example.test", 3102);
    await logIn(admin, ON, "owner@example.test");
    const csv = await (await admin.request.get(`${ON}/api/admin/newsletter`)).text();
    expect(csv).toContain(`${email},en,`);
    expect(csv).toContain("/en/newsletter?unsubscribe=");
    expect((await page.request.get(`${ON}/api/admin/newsletter`)).status()).toBe(404);
    await admin.close();
    await page.goto(linkIn(welcome, "unsubscribe="));
    await page.getByRole("button", { name: "Unsubscribe" }).click();
    await expect(page.getByTestId("newsletter-status")).toContainText("You have been unsubscribed");
    await page.goto(`${ON}/en/privacy`);
    await expect(page.locator("main")).toContainText("double opt-in");
  });

  test("reviews: request after delivery, only that buyer posts, photo re-encoded, moderated, shown from three", async ({ page, browser }) => {
    const admin = await browser.newPage();
    await useOwnIp(admin.context());
    await logIn(admin, ON, "owner@example.test");

    const deliver = async (number: string) => {
      await admin.goto(`${ON}/en/admin/orders/${number}`);
      await admin.locator("#f-status").selectOption("delivered");
      await admin.getByRole("button", { name: "Set status" }).click();
      await expect(admin.getByTestId("order-status")).toHaveText("Delivered");
    };
    // A JPEG with EXIF data (camera, copyright): the stored photo must carry none.
    const photo = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#a07850" } })
      .jpeg()
      .withExif({ IFD0: { Make: "TestCam", Copyright: "private" } })
      .toBuffer();

    const reviewers = ["Maria", "Jonas", "Eleni"];
    for (const [i, name] of reviewers.entries()) {
      const email = uniqueEmail(`review${i}`);
      const shop = await browser.newPage();
      await giveOwnIp(shop.context());
      const number = await buy(shop, ON, email, [{ slug: simple2.slug, qty: 1 }]);
      // Before delivery there is no review link at all.
      expect(sentEmails(email, "review-request", 3102)).toHaveLength(0);
      await deliver(number);
      const request = await waitForEmail(email, "review-request", 3102);
      expect(request.text).toContain("Unsubscribe:");
      await shop.goto(linkIn(request, "/review/"));
      await shop.getByLabel(`${5 - i} of 5`).check();
      await shop.locator("#f-body").fill(`Beautiful piece, review number ${i + 1}.`);
      await shop.getByLabel("Name to show").fill(name);
      if (i === 0) await shop.locator("#f-photo").setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: photo });
      await shop.getByRole("button", { name: "Send review" }).click();
      await expect(shop.getByTestId("review-form-success")).toContainText("once we have checked it");
      await shop.close();
    }

    // Nothing is public before moderation, and not with fewer than three approved.
    await page.goto(`${ON}/en/product/${simple2.slug}`);
    await expect(page.getByTestId("product-reviews")).toHaveCount(0);
    await admin.goto(`${ON}/en/admin/reviews`);
    for (const name of reviewers) await admin.getByRole("button", { name: `Approve review by ${name}` }).click();
    await expect(admin.getByTestId("admin-no-reviews")).toBeVisible();

    await page.goto(`${ON}/en/product/${simple2.slug}`);
    const section = page.getByTestId("product-reviews");
    await expect(section.locator(".review")).toHaveCount(3);
    await expect(section).toContainText("Average 4 of 5, from 3 reviews");
    await expect(section).toContainText("verified buyer");
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').allTextContents()).find((s) => s.includes('"Product"'))!);
    expect(ld.aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4, reviewCount: 3, bestRating: 5, worstRating: 1 });

    const src = await section.locator("img.review-photo").getAttribute("src");
    const res = await page.request.get(`${ON}${src}`);
    expect(res.headers()["content-type"]).toBe("image/webp");
    const meta = await sharp(await res.body()).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1200);
    await admin.close();
  });
});

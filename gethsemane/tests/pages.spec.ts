import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalScroll, infoPages, locales, waitForHydration, watchErrors } from "./helpers";

const WA = "https://wa.me/970569741193";

function waText(href: string | null): string {
  expect(href).not.toBeNull();
  // Properly encoded: nothing but URL-safe characters after ?text=
  expect(href!).toMatch(/^https:\/\/wa\.me\/970569741193\?text=[A-Za-z0-9%\-_.!~*'()]+$/);
  const url = new URL(href!);
  expect(`${url.origin}${url.pathname}`).toBe(WA);
  return url.searchParams.get("text") ?? "";
}

async function jsonLd(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b) as Record<string, unknown>);
}

test.describe("help and policy pages", () => {
  test("every page answers 200 in all 10 languages with lang, canonical, hreflang and a sitemap entry", async ({ request, baseURL, isMobile }) => {
    test.skip(isMobile, "run once");
    test.setTimeout(120_000);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of infoPages) {
      for (const locale of locales) {
        const url = `${baseURL}/${locale}${path}`;
        const res = await request.get(url);
        expect(res.status(), url).toBe(200);
        const html = await res.text();
        expect(html).toContain(`<html lang="${locale}"`);
        expect(html).toContain(`<link rel="canonical" href="${url}"/>`);
        for (const l of locales) expect(html).toContain(`hrefLang="${l}" href="${baseURL}/${l}${path}"`);
        expect(html).toContain(`hrefLang="x-default" href="${baseURL}/en${path}"`);
        expect(sitemap).toContain(`<loc>${url}</loc>`);
        expect(html).not.toMatch(/\bTODO\b/);
      }
    }
    // Every alternate in the sitemap carries the x-default.
    expect((sitemap.match(/hreflang="x-default"/g) ?? []).length).toBe(10 * 28);
  });

  test("pages render without console errors and fit 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    const errors = watchErrors(page);
    for (const path of infoPages) {
      await page.goto(`/el${path}`);
      await waitForHydration(page);
      await expect(page.locator("h1")).toHaveCount(1);
      await expectNoHorizontalScroll(page);
    }
    expect(errors).toEqual([]);
  });

  test("FAQ accordion works with the keyboard and has FAQPage JSON-LD", async ({ page }) => {
    await page.goto("/en/faq");
    const first = page.locator("details").first();
    const summary = first.locator("summary");
    await summary.focus();
    await expect(summary).toBeFocused();
    await expect(first).not.toHaveAttribute("open", /.*/);
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", "");
    await expect(first.locator("p")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(first).not.toHaveAttribute("open", /.*/);
    await page.keyboard.press("Tab");
    await expect(page.locator("details").nth(1).locator("summary")).toBeFocused();

    const faq = (await jsonLd(page)).find((d) => d["@type"] === "FAQPage")!;
    const items = faq.mainEntity as { name: string; acceptedAnswer: { text: string } }[];
    expect(items).toHaveLength(12);
    // Answers match the policy values from config.
    expect(items.find((i) => i.name === "Can I return a piece?")!.acceptedAnswer.text).toContain("within 14 days of delivery");
    expect(items.find((i) => i.name === "How do I pay?")!.acceptedAnswer.text).toContain("payment instructions");
  });

  test("returns page has the model withdrawal form and last-updated date", async ({ page }) => {
    await page.goto("/de/returns");
    await expect(page.getByRole("heading", { name: "Muster-Widerrufsformular" })).toBeVisible();
    await expect(page.getByText("Zuletzt aktualisiert: 24. Oktober 2026")).toBeVisible();
    await expect(page.getByText(/bleiben Ihre gesetzlichen Rechte|berühren Ihre gesetzlichen Rechte nicht/)).toBeVisible();
  });

  test("terms: legal notice without empty fields and no EU ODR link", async ({ page }) => {
    await page.goto("/en/terms");
    const notice = page.locator("#legal-notice-title + ul");
    await expect(notice).toContainText("WhatsApp: +970569741193");
    await expect(notice).toContainText("Sister store of holylandtimber.com (same ownership).");
    await expect(notice).toContainText("129 Al Mahed Street");
    await expect(notice).not.toContainText("Business name");
    await expect(notice).not.toContainText("Email:");
    expect(await page.content()).not.toContain("ec.europa.eu/consumers/odr");
    await expect(page.getByText("Otherwise these terms are governed by: [to be confirmed].")).toBeVisible();
  });

  test("contact: topic chips change the WhatsApp message; no form; email hidden while not set", async ({ page }) => {
    await page.goto("/pl/contact?topic=wholesale");
    await waitForHydration(page);
    const link = page.getByTestId("contact-whatsapp");
    expect(waText(await link.getAttribute("href"))).toContain("zamówienia hurtowego");
    await page.getByRole("radio", { name: "Pomoc", exact: true }).check();
    expect(waText(await link.getAttribute("href"))).toContain("Potrzebuję pomocy z zamówieniem");
    await expect(page.locator("main form")).toHaveCount(0);
    await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator("main address")).toHaveText("129 Al Mahed Street, Bethlehem, Palestinian Territory");
    await expect(page.getByText(/poniedziałek–piątek, 09:00–17:00/i)).toBeVisible();
  });

  test("privacy page states what the site really stores", async ({ page }) => {
    await page.goto("/en/privacy");
    const text = await page.locator("main").innerText();
    expect(text).toContain("There are no customer accounts");
    expect(text).toContain("stored only in your own browser");
    expect(text).toContain("We do not sell or share personal data");
    // The site really sets no third-party or tracking cookies.
    const cookies = await page.context().cookies();
    expect(cookies.map((c) => c.name).filter((n) => !["NEXT_LOCALE", "currency"].includes(n))).toEqual([]);
  });

  test("security.txt is served", async ({ request, baseURL }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain(`Contact: ${baseURL}/en/contact`);
    expect(text).toMatch(/Expires: \d{4}-\d{2}-\d{2}T/);
  });
});

test.describe("WhatsApp ordering", () => {
  for (const [locale, slug, expected] of [
    ["uk", "salad-bowl", "1 × Салатниця"],
    ["el", "jerusalem-cross", "1 × Σταυρός Ιερουσαλήμ"],
    ["pl", "rosary-olive-wood", "1 × Różaniec z drewna oliwnego"],
  ] as const) {
    test(`product page message in ${locale} is correctly encoded`, async ({ page }) => {
      await page.goto(`/${locale}/product/${slug}`);
      await waitForHydration(page);
      const text = waText(await page.locator("#order-row [data-testid=whatsapp-order]").getAttribute("href"));
      expect(text).toContain(expected);
      expect(text).toContain("Gethsemane");
      expect(text).toMatch(/USD/);
      const ask = waText(await page.locator("#order-row a.text-link").getAttribute("href"));
      expect(ask).toContain("Gethsemane");
    });
  }

  test("order page message lists items, quantities, currency, USD total, country and gift note", async ({ page }) => {
    await page.goto("/uk");
    await page.evaluate(() => localStorage.setItem("gethsemane.cart.v1", JSON.stringify([{ slug: "salad-bowl", qty: 2 }])));
    await page.goto("/uk/cart");
    await waitForHydration(page);
    await page.locator("#currency-select").selectOption("GBP");
    await page.getByLabel("Країна доставки").fill("Україна");
    await page.getByLabel("Додати листівку до подарунка").check();
    await page.getByLabel("Текст листівки").fill("З Різдвом!");
    const link = page.getByRole("link", { name: /Надіслати замовлення у WhatsApp/ });
    const text = waText(await link.getAttribute("href"));
    expect(text).toContain("2 × Салатниця");
    expect(text).toContain("Обрана валюта: GBP");
    expect(text).toMatch(/Разом у USD: 138,00\sUSD|Разом у USD: 138,00\s\$/);
    expect(text).toContain("Країна: Україна");
    expect(text).toContain("Листівка до подарунка: З Різдвом!");
    // Details persist in this browser only.
    await page.reload();
    await expect(page.getByLabel("Країна доставки")).toHaveValue("Україна");
    // Copy fallback.
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Копіювати повідомлення" }).click();
    await expect(page.getByText(/Повідомлення скопійовано|Копіювання тут недоступне/)).toBeVisible();
    await expect(page.getByTestId("message-preview")).toHaveValue(/2 × Салатниця/);
  });

  test("order page shows the steps and the policy summary even when empty", async ({ page }) => {
    await page.goto("/en/cart");
    await expect(page.getByRole("heading", { name: "Your order is empty." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nativity sets" })).toHaveAttribute("href", "/en/shop/nativity");
    await expect(page.getByRole("heading", { name: "How ordering works" })).toBeVisible();
    await expect(page.locator(".order-steps li")).toHaveCount(4);
    await expect(page.locator(".policy-summary")).toContainText("payment instructions");
  });
});

test.describe("structured data", () => {
  test("home: Organization with return policy and WebSite", async ({ page, baseURL }) => {
    await page.goto("/en");
    const data = await jsonLd(page);
    const org = data.find((d) => d["@type"] === "Organization")!;
    expect(org.name).toBe("Gethsemane");
    expect(org.url).toBe(baseURL);
    expect((org.hasMerchantReturnPolicy as Record<string, unknown>).merchantReturnDays).toBe(14);
    expect(org.sameAs).toEqual(["https://holylandtimber.com"]);
    expect(JSON.stringify(org)).not.toContain("vercel.app");
    expect(data.find((d) => d["@type"] === "WebSite")).toBeTruthy();
  });

  test("product: USD only, server-rendered, with breadcrumbs", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "currency", value: "EUR", url: baseURL! }]);
    const res = await page.request.get("/fr/product/salad-bowl", { headers: { cookie: "currency=EUR" } });
    const html = await res.text();
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)].map((m) => JSON.parse(m[1]!));
    const product = blocks.find((d) => d["@type"] === "Product");
    expect(product.offers.priceCurrency).toBe("USD");
    expect(product.offers.price).toBe("69.00");
    expect(product.brand.name).toBe("Gethsemane");
    expect(product.material).toBe("Olive wood");
    expect(product.offers.shippingDetails.deliveryTime.transitTime).toMatchObject({ minValue: 7, maxValue: 15 });
    expect(product.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(14);
    expect(JSON.stringify(product)).not.toMatch(/EUR|€/);
    const crumbs = blocks.find((d) => d["@type"] === "BreadcrumbList");
    expect(crumbs.itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2, 3, 4]);
    expect(crumbs.itemListElement[3].item).toBe(`${baseURL}/fr/product/salad-bowl`);
  });
});

test.describe("layout and navigation", () => {
  test("header mark size and one-line wordmark", async ({ page, isMobile }) => {
    await page.setViewportSize(isMobile ? { width: 320, height: 700 } : { width: 1280, height: 800 });
    await page.goto("/de");
    const mark = (await page.locator(".site-header img.logo-mark").boundingBox())!;
    if (isMobile) expect(mark.height).toBeGreaterThanOrEqual(44);
    if (isMobile) expect(mark.height).toBeLessThanOrEqual(48);
    else expect(mark.height).toBeGreaterThanOrEqual(52);
    if (!isMobile) expect(mark.height).toBeLessThanOrEqual(56);
    const word = (await page.locator(".site-header .logo-name").boundingBox())!;
    expect(word.height).toBeLessThan(36);
    // The header mark is not given high fetch priority (the hero emblem is the real LCP image).
    await expect(page.locator(".site-header img.logo-mark")).not.toHaveAttribute("fetchpriority", "high");
    await expect(page.locator(".hero-mark")).toHaveAttribute("fetchpriority", "high");
  });

  test("empty SOCIAL renders no social icons; sister store link is present", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByTestId("social-links")).toHaveCount(0);
    await expect(page.locator('footer a[href*="facebook.com"], footer a[href*="tiktok.com"]')).toHaveCount(0);
    const sisterIg = page.locator('footer a[href="https://www.instagram.com/holylandtimber"]');
    await expect(sisterIg).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("mobile language dialog: accessible, traps focus, Esc closes and returns focus", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phones only");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/shop");
    await waitForHydration(page);
    await expect(page.locator(".lang-fab-button")).toBeHidden();
    const button = page.getByTestId("language-dialog-button");
    await expect(button).toHaveAttribute("aria-haspopup", "dialog");
    const dialogId = await button.getAttribute("aria-controls");
    await button.click();
    const dialog = page.getByRole("dialog", { name: "Choose a language" });
    await expect(dialog).toBeVisible();
    expect(await dialog.getAttribute("id")).toBe(dialogId);
    await expect(dialog.locator("a")).toHaveCount(10);
    await expect(dialog.locator('a[aria-current="true"]')).toHaveAttribute("hreflang", "en");
    await expect(dialog.locator('a[aria-current="true"]')).toBeFocused();
    // Focus stays inside: Tab from the last link wraps to the close button.
    await dialog.locator('a[hreflang="pt"]').focus();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator('a[hreflang="pt"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
    // Choosing a language keeps the page.
    await button.click();
    await dialog.locator('a[hreflang="el"]').click();
    await page.waitForURL("**/el/shop");
    await expect(page.locator("html")).toHaveAttribute("lang", "el");
  });

  test("sticky order bar appears after the inline buttons and never covers the bottom nav", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phones only");
    await page.goto("/en/product/nativity-set-classic");
    await waitForHydration(page);
    const bar = page.locator(".order-bar");
    await expect(bar).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.getElementById("order-row")!.getBoundingClientRect().bottom + window.scrollY + 40));
    await expect(bar).toBeVisible();
    const barBox = (await bar.boundingBox())!;
    const navBox = (await page.locator(".bottom-nav").boundingBox())!;
    expect(barBox.y + barBox.height).toBeLessThanOrEqual(navBox.y + 1);
    expect(waText(await bar.locator("a").getAttribute("href"))).toContain("1 × Classic Nativity Set");
    // At the end of the page nothing in the footer is covered.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const last = (await page.locator(".footer-bottom p").last().boundingBox())!;
    expect(last.y + last.height).toBeLessThanOrEqual(barBox.y + 1);
  });

  test("product page: specs only for existing data, accordions link to policy pages", async ({ page }) => {
    await page.goto("/en/product/salad-bowl");
    const specs = page.getByTestId("specs");
    await expect(specs.locator("dt")).toHaveText(["Wood"]);
    await expect(specs.locator("dd")).toHaveText(["Olive wood"]);
    for (const [summary, href] of [
      ["Shipping", "/en/shipping"],
      ["Returns", "/en/returns"],
      ["Care", "/en/care"],
    ] as const) {
      await page.locator("summary", { hasText: summary }).first().click();
      await expect(page.locator(`.product-accordion a[href="${href}"]`)).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Be the first to tell us" })).toBeVisible();
    expect(await page.content()).not.toMatch(/[★☆]|aggregateRating/);
  });
});

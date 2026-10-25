import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { firstCategory, nameOf, price, priceOf, simple } from "./catalog";
import { locales, pages, waitForHydration } from "./helpers";

const NAME = nameOf(simple);


async function withCart(page: Page, lines: { slug: string; qty: number }[], details?: Record<string, unknown>) {
  await page.goto("/en");
  await page.evaluate(
    ([l, d]) => {
      localStorage.setItem("gethsemane.cart.v2", JSON.stringify(l));
      if (d) localStorage.setItem("gethsemane.order-details.v1", JSON.stringify(d));
      else localStorage.removeItem("gethsemane.order-details.v1");
    },
    [lines, details] as const,
  );
}

test.describe("indexing", () => {
  test.skip(({ isMobile }) => isMobile, "server responses only");

  test("a *.vercel.app host is noindex and disallowed; the real host is indexable", async ({ request, baseURL }) => {
    const preview = { host: "gethsemane-git-main-example.vercel.app" };
    const robotsPreview = await (await request.get("/robots.txt", { headers: preview })).text();
    expect(robotsPreview).toMatch(/Disallow: \//);
    expect(robotsPreview).not.toContain("Sitemap:");
    expect((await request.get("/en", { headers: preview })).headers()["x-robots-tag"]).toBe("noindex, nofollow");

    const home = await request.get("/en");
    expect(home.headers()["x-robots-tag"]).toBeUndefined();
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Allow: \//);
    expect(robots).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) expect(m[1]!.startsWith(`${baseURL}/`)).toBe(true);
  });

  test("cart and wishlist are noindex and not in the sitemap; catalog pages wait for CATALOG_READY", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const path of ["/cart", "/wishlist", "/shop", pages.category, pages.product]) {
      const html = await (await request.get(`/en${path}`)).text();
      expect(html, path).toContain('<meta name="robots" content="noindex, follow"/>');
      expect(sitemap).not.toContain(`/en${path}<`);
    }
    const about = await (await request.get("/en/about")).text();
    expect(about).not.toContain('name="robots"');
  });

  test("a malformed locale segment is a 404, not an error", async ({ request }) => {
    expect((await request.get(`/x.y${pages.product}`)).status()).toBe(404);
    expect((await request.get(`/x.y${pages.category}`)).status()).toBe(404);
  });

  test("security headers, caching and security.txt", async ({ request }) => {
    const res = await request.get("/en");
    expect(res.headers()["strict-transport-security"]).toBe("max-age=63072000");
    expect((await request.get(firstCategory.image)).headers()["cache-control"]).toBe("public, max-age=86400");
    expect((await request.get("/brand/gethsemane-mark.svg")).headers()["cache-control"]).toBe("public, max-age=86400");
    const txt = await (await request.get("/.well-known/security.txt")).text();
    const expires = new Date(txt.match(/Expires: (.+)/)![1]!);
    const days = (expires.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(300);
    expect(days).toBeLessThanOrEqual(366);
  });
});

test.describe("order flow", () => {
  test("product page: Add to order, then a lasting View your order link; Buy now", async ({ page }) => {
    await page.goto(`/en${pages.product}`);
    await waitForHydration(page);
    const add = page.locator(".buy-row").getByRole("button", { name: `Add to order: ${NAME}` });
    await expect(page.getByTestId("view-order")).toHaveCount(0);
    await add.click();
    await expect(page.getByTestId("view-order")).toBeVisible();
    await page.waitForTimeout(2300);
    await expect(page.getByTestId("view-order")).toBeVisible();
    await expect(page.getByTestId("view-order")).toHaveAttribute("href", "/en/cart");
    await expect(page.locator("#order-row").getByRole("button", { name: `Buy now: ${NAME}` })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ask about this piece/ })).toBeVisible();
    // Product cards name the piece in the button's accessible name, visible text first.
    const card = page.locator(".product-card").first();
    const name = (await card.locator("h3").textContent())!.trim();
    await expect(card.getByRole("button", { name: `Add to order: ${name}` })).toBeVisible();
  });

  test("cart summary: shipping at checkout, charged in USD; old saved details are deleted", async ({ page }) => {
    await withCart(page, [{ slug: simple.slug, qty: 1 }], { name: "Ana", country: "Portugal", notes: "", giftNote: false, giftNoteText: "" });
    await page.goto("/en/cart");
    await waitForHydration(page);
    await expect(page.getByText("Items total in USD (shipping not included)")).toBeVisible();
    await expect(page.locator(".summary-shipping")).toHaveText(/Shipping\s*Calculated at checkout/);
    await expect(page.locator(".summary")).toContainText("Prices are charged in US dollars (USD) at checkout.");
    await expect(page.getByTestId("to-checkout")).toHaveAttribute("href", "/en/checkout");
    // Details from the old order form are no longer kept in the browser.
    await expect.poll(() => page.evaluate(() => localStorage.getItem("gethsemane.order-details.v1"))).toBeNull();
  });

  test("quantity can be typed (12) and is committed on blur or Enter", async ({ page }) => {
    await withCart(page, [{ slug: simple.slug, qty: 1 }]);
    await page.goto("/en/cart");
    await waitForHydration(page);
    const qty = page.locator(`#qty-${simple.slug}`);
    await qty.fill("");
    await qty.pressSequentially("12");
    await expect(qty).toHaveValue("12");
    await qty.press("Tab");
    await expect(qty).toHaveValue("12");
    await expect(page.locator(".subtotal-usd")).toHaveText(price(priceOf(simple) * 12));
    await qty.fill("99");
    await qty.press("Enter");
    await expect(qty).toHaveValue("20");
    // At the quantity limit, wholesale is offered.
    await expect(page.getByRole("link", { name: "Need more? Ask about wholesale" })).toHaveAttribute("href", "/en/bulk-orders");
  });

  test("the cart works when localStorage throws", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const fail = () => {
        throw new DOMException("denied", "SecurityError");
      };
      Object.defineProperty(window, "localStorage", { get: fail, configurable: true });
    });
    await page.goto(`/en${pages.product}`);
    await waitForHydration(page);
    await page.locator(".buy-row").getByRole("button", { name: /Add to order/ }).click();
    await page.getByTestId("view-order").click();
    await expect(page.getByRole("heading", { name: NAME })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("noscript fallback and wishlist note", async ({ page, request }) => {
    const html = await (await request.get("/en/cart")).text();
    expect(html).toMatch(/<noscript>.*JavaScript is turned off.*href="\/en\/contact"/s);
    await page.goto("/en/wishlist");
    await expect(page.getByText("Your wishlist is stored only in this browser.")).toBeVisible();
  });
});

test.describe("contact, legal and footer", () => {
  test("contact: Bethlehem time, never the time-zone ID", async ({ page }) => {
    await page.goto("/de/contact?topic=wholesale");
    await expect(page.locator("main")).not.toContainText("Asia/Hebron");
    await expect(page.locator('section[aria-labelledby="hours-title"]')).toContainText("Ortszeit Bethlehem");
  });

  test("with CONTACT_EMAIL set, the email wording and mailto links appear", async ({ page }) => {
    for (const [path, wording] of [
      ["/privacy", /Contact form messages/],
      ["/returns", /by email/],
      ["/withdrawal", /Withdraw by email/],
      ["/terms", /Email: gethsemane\.t12@gmail\.com/],
    ] as const) {
      await page.goto(`/en${path}`);
      await expect(page.locator("main"), path).toContainText(wording);
      expect(await page.locator('main a[href^="mailto:gethsemane.t12@gmail.com"]').count(), path).toBeGreaterThan(0);
    }
    // The model withdrawal form is addressed to the email too.
    await page.goto("/en/withdrawal");
    await expect(page.locator(".withdrawal-form li").first()).toContainText("gethsemane.t12@gmail.com");
  });

  test("footer lists Returns once (Support) and the withdrawal page under Legal", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(".site-footer").getByRole("link", { name: "Returns", exact: true })).toHaveCount(1);
    await expect(page.locator("#footer-legal + ul").getByRole("link", { name: "Withdraw from a contract" })).toHaveAttribute("href", "/en/withdrawal");
  });

  test("withdrawal page: prefilled email notice, the contact form and the model form; linked from returns", async ({ page }) => {
    await page.goto("/en/returns");
    await page.getByRole("link", { name: "withdrawal page" }).click();
    await expect(page).toHaveURL(/\/en\/withdrawal$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Withdraw from a contract");
    const href = (await page.getByTestId("withdraw-email").getAttribute("href"))!;
    expect(href).toMatch(/^mailto:gethsemane\.t12@gmail\.com\?subject=Gethsemane%3A%20withdrawal%20from%20contract&body=/);
    const body = decodeURIComponent(href.split("body=")[1]!);
    for (const field of ["Name:", "Order number:", "Pieces:", "Date received:"]) expect(body).toContain(field);
    await expect(page.getByTestId("withdraw-form")).toHaveAttribute("href", "/en/contact?topic=support");
    await expect(page.locator("main")).not.toContainText(/whats\s*app/i);
    await expect(page.getByRole("heading", { name: "Model withdrawal form", level: 3 })).toBeVisible();
  });

  test("returns and terms carry the reviewed wording", async ({ page }) => {
    await page.goto("/en/returns");
    const returns = page.locator("main");
    await expect(returns).toContainText("These limits do not apply to your statutory right of withdrawal (EU/UK) or your legal guarantees.");
    await expect(returns).toContainText("except where faulty");
    await expect(returns).toContainText("“Original payment method” means the card you paid with at checkout.");
    await page.goto("/en/terms");
    const terms = page.locator("main");
    await expect(terms).toContainText("By pressing “Order and pay” you place an order with an obligation to pay.");
    await expect(terms).toContainText("The contract is formed when your payment is confirmed.");
    await expect(terms).toContainText("durable medium");
    await expect(terms).not.toContainText("offer to buy");
  });

  test("privacy names the cookies, the host, the controller and the legal bases", async ({ page }) => {
    await page.goto("/en/privacy");
    const main = page.locator("main");
    for (const text of ["NEXT_LOCALE", "strictly necessary", "a session cookie", "Vercel Inc. in the United States", "129 Al Mahed Street", "Legal bases", "accounting records", "pseudonymised (hashed)", "We do not sell or share personal data"]) {
      await expect(main).toContainText(text);
    }
  });

  test("shipping wording, region label, rates date and About breadcrumb", async ({ page }) => {
    await page.goto("/en/shipping");
    await expect(page.locator("main")).toContainText("typically 7–15 business days to most destinations; remote areas can take longer");
    await expect(page.locator("main")).toContainText("We describe the contents and value truthfully on customs forms.");
    await expect(page.getByRole("rowheader", { name: "Europe (including the UK)" })).toBeVisible();
    await expect(page.locator(".site-footer")).toContainText(/rates as of 24 October 2026/);
    await page.goto("/en/about");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
    await expect(page.locator('[data-testid="product-safety"]')).toHaveCount(0);
  });

  test("Portuguese is labelled Português (PT) in every language list", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator(".site-footer")).toContainText("Português (PT)");
    expect(locales).toContain("pt");
  });
});

test.describe("accessibility (axe)", () => {
  for (const path of ["/en", `/en${pages.product}`, `/en${pages.fixture}`, "/en/cart", "/en/faq"]) {
    test(`no axe violations on ${path}`, async ({ page }) => {
      if (path === "/en/cart") await withCart(page, [{ slug: simple.slug, qty: 2 }]);
      await page.goto(path);
      await waitForHydration(page);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});

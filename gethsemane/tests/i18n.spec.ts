import { expect, test, type Page } from "@playwright/test";
import { locales, waitForHydration } from "./helpers";

const heroTitles: Record<string, string> = {
  en: "Olive wood, carved by hand in Bethlehem.",
  de: "Olivenholz, von Hand geschnitzt in Bethlehem.",
  el: "Ελιόξυλο, σκαλισμένο στο χέρι στη Βηθλεέμ.",
};

for (const locale of locales) {
  test(`/${locale} has lang, canonical and a full hreflang set`, async ({ page }) => {
    const res = await page.goto(`/${locale}/shop`);
    expect(res?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).not.toHaveAttribute("dir", /.*/);
    const base = new URL(page.url()).origin;
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${base}/${locale}/shop`);
    const alternates = page.locator('link[rel="alternate"][hreflang]');
    await expect(alternates).toHaveCount(locales.length + 1);
    for (const l of locales) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${l}"]`)).toHaveAttribute("href", `${base}/${l}/shop`);
    }
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", `${base}/en/shop`);
    // The logo lockup is English in every language.
    await expect(page.locator(".site-header .logo-name")).toHaveText("GETHSEMANE");
    await expect(page.locator(".site-footer .logo-tagline")).toHaveText("OLIVE WOOD · HOLY LAND");
  });
}

/** Opens the language list: the floating button on desktop, the bottom-navigation dialog on phones. */
async function openLanguages(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByTestId("language-dialog-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    return page.locator(".language-dialog-list a");
  }
  await page.locator(".lang-fab-button").click();
  return page.locator(".lang-menu a");
}

test("no Arabic option or text anywhere", async ({ page, isMobile }) => {
  await page.goto("/en");
  await waitForHydration(page);
  const options = await openLanguages(page, isMobile);
  await expect(options).toHaveCount(10);
  await expect(options).toHaveText([
    /English/, /Français/, /Español/, /Italiano/, /Deutsch/, /Ελληνικά/, /Polski/, /Română/, /Українська/, /Português/,
  ]);
  const html = await page.content();
  const arabic = new RegExp(`[${String.fromCodePoint(0x0600)}-${String.fromCodePoint(0x06ff)}]`);
  expect(html).not.toMatch(arabic);
});

test("root redirects using Accept-Language, then the saved choice", async ({ browser }) => {
  const context = await browser.newContext({ locale: "de-DE", extraHTTPHeaders: { "Accept-Language": "de-DE,de;q=0.9,en;q=0.5" } });
  const page = await context.newPage();
  await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/de");
  await page.goto("/shop");
  expect(new URL(page.url()).pathname).toBe("/de/shop");
  // Let the page finish hydrating (it re-saves the language it shows) before changing the cookie.
  await waitForHydration(page);
  await context.addCookies([{ name: "NEXT_LOCALE", value: "pl", domain: "localhost", path: "/" }]);
  await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/pl");
  await waitForHydration(page);
  // A tampered cookie falls back safely.
  await context.addCookies([{ name: "NEXT_LOCALE", value: "<script>", domain: "localhost", path: "/" }]);
  await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/de");
  await context.close();
});

test("switching language keeps the page and the scroll position", async ({ page, isMobile }) => {
  await page.goto("/en/shop");
  await waitForHydration(page);
  // Scroll down to a spot where the language control is shown (the floating button steps aside over controls).
  let target = 600;
  for (; target < 3000; target += 50) {
    await page.evaluate((y) => window.scrollTo(0, y), target);
    await page.waitForTimeout(200);
    if (isMobile || (await page.locator(".lang-fab-button").isVisible())) break;
  }
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(500);

  await (await openLanguages(page, isMobile)).and(page.locator('[hreflang="de"]')).click();
  await page.waitForURL("**/de/shop");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("h1")).toHaveText("Shop");
  await expect(page.locator(".result-count")).toHaveText("12 Produkte");
  const after = await page.evaluate(() => window.scrollY);
  expect(Math.abs(after - before)).toBeLessThan(40);

  // Back to the home page in Greek, and the choice is remembered.
  await (await openLanguages(page, isMobile)).and(page.locator('[hreflang="el"]')).click();
  await page.waitForURL("**/el/shop");
  await page.goto("/");
  expect(new URL(page.url()).pathname).toBe("/el");
  await expect(page.locator("h1")).toHaveText(heroTitles.el!);
  expect(await page.evaluate(() => localStorage.getItem("gethsemane.language.v1"))).toBe("el");
});

test("language menu is keyboard accessible", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones use the language dialog (see pages.spec.ts)");
  await page.goto("/en/about");
  await waitForHydration(page);
  const button = page.locator(".lang-fab-button");
  await button.focus();
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".lang-menu a[hreflang='en']")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator(".lang-menu a[hreflang='fr']")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
  await expect(page.locator(".lang-menu")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await expect(page.locator(".lang-menu a[hreflang='pt']")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/pt/about");
  await expect(page.locator("h1")).toHaveText("A nossa história");
});

test("home page title per language", async ({ page }) => {
  for (const [locale, title] of Object.entries(heroTitles)) {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toHaveText(title);
  }
});

test("sitemap.xml and robots.txt", async ({ request, baseURL }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(`Sitemap: ${baseURL}/sitemap.xml`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(urls.length).toBe(10 * 28);
  for (const l of locales) expect(urls).toContain(`${baseURL}/${l}`);
  expect(xml).toContain('hreflang="x-default"');
  expect(urls.some((u) => u?.includes("/cart"))).toBe(false);
});

import { expect, test, type Locator, type Page } from "@playwright/test";
import { CONTACT_EMAIL, SOCIAL, SOCIAL_HANDLES } from "../src/config/store";
import { cleanUrl, socialLinks } from "../src/lib/social";
import { waitForHydration } from "./helpers";

// The exact public URLs: our own profiles, without any share-tracking parameters.
const EXPECTED = {
  instagram: "https://www.instagram.com/gethsemane_t12",
  tiktok: "https://www.tiktok.com/@gethsemane.store",
  facebook: "https://www.facebook.com/gethsemane.t12",
};
const TRACKING = /[?&](utm_[a-z]+|xtok|_r|_t|mibextid|fbclid|igsh)=/i;

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

async function checkLinks(links: Locator, { label }: { label: boolean }) {
  await expect(links).toHaveCount(3);
  for (const [i, [network, url]] of Object.entries(EXPECTED).entries()) {
    const link = links.nth(i);
    await expect(link).toHaveAttribute("href", url);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(await link.getAttribute("href")).not.toMatch(TRACKING);
    if (label) {
      const name = { instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook" }[network];
      await expect(link).toHaveAttribute("aria-label", `Gethsemane on ${name} (opens in a new tab)`);
    }
  }
}

test.describe("configuration (no browser)", () => {
  test.skip(({ isMobile }) => isMobile, "run once");

  test("config holds the clean URLs, handles and email", () => {
    expect(SOCIAL).toEqual(EXPECTED);
    expect(SOCIAL_HANDLES).toEqual({ instagram: "@gethsemane_t12", tiktok: "@gethsemane.store", facebook: "@gethsemane.t12" });
    expect(CONTACT_EMAIL).toBe("gethsemane.t12@gmail.com");
    for (const url of Object.values(SOCIAL)) expect(url).not.toMatch(TRACKING);
  });

  test("tracking parameters are stripped and empty entries render nothing", () => {
    expect(cleanUrl("https://www.tiktok.com/@gethsemane.store?_t=ZS-123&_r=1&xtok=abc")).toBe(EXPECTED.tiktok);
    expect(cleanUrl("https://www.instagram.com/gethsemane_t12?utm_source=ig&igsh=xyz")).toBe(EXPECTED.instagram);
    expect(cleanUrl("https://www.facebook.com/gethsemane.t12?mibextid=wwXIfr&fbclid=abc")).toBe(EXPECTED.facebook);
    expect(socialLinks({ instagram: "", tiktok: " ", facebook: "" }, {})).toEqual([]);
    const one = socialLinks({ instagram: "", tiktok: EXPECTED.tiktok, facebook: "" }, { tiktok: "@gethsemane.store" });
    expect(one).toEqual([{ network: "tiktok", name: "TikTok", url: EXPECTED.tiktok, handle: "@gethsemane.store" }]);
  });
});

test.describe("where the accounts and the email appear", () => {
  test("footer: three labelled icon links and the email in Support", async ({ page }) => {
    await page.goto("/en");
    await checkLinks(page.getByTestId("social-links").locator("a"), { label: true });
    await expect(page.locator("#footer-support + ul").getByTestId("footer-email")).toHaveAttribute("href", "mailto:gethsemane.t12@gmail.com");
    // The sister store link stays.
    await expect(page.locator('footer a[href="https://www.instagram.com/holylandtimber"]')).toBeVisible();
  });

  test("footer labels are localized", async ({ page }) => {
    await page.goto("/de");
    await expect(page.getByTestId("social-links").locator("a").first()).toHaveAttribute("aria-label", "Gethsemane auf Instagram (öffnet sich in einem neuen Tab)");
  });

  test("home: Follow along with three pills (platform name and handle), no embeds", async ({ page }) => {
    await page.goto("/en");
    const section = page.getByTestId("follow-along");
    await expect(section.getByRole("heading", { name: "Follow along" })).toBeVisible();
    await expect(section).toContainText("See new pieces and the work behind them.");
    const pills = section.locator("a");
    await checkLinks(pills, { label: false });
    await expect(pills.nth(0)).toContainText("Instagram");
    await expect(pills.nth(0)).toContainText("@gethsemane_t12");
    await expect(pills.nth(1)).toContainText("@gethsemane.store");
    await expect(pills.nth(2)).toContainText("Facebook");
    await expect(pills.nth(2)).toContainText("@gethsemane.t12");
    await expect(section.locator("iframe, img, script")).toHaveCount(0);
    // It is the last section before the footer.
    expect(await section.evaluate((el) => el.nextElementSibling?.tagName ?? "none")).not.toBe("SECTION");
  });

  test("contact and about pages", async ({ page }) => {
    await page.goto("/en/contact");
    await expect(page.getByTestId("contact-email")).toHaveAttribute("href", "mailto:gethsemane.t12@gmail.com?subject=Question%20about%20Gethsemane");
    await checkLinks(page.getByTestId("contact-social-card").locator("a"), { label: false });
    await expect(page.getByTestId("contact-whatsapp")).toBeVisible();
    await expect(page.locator(".chip-group input[type=radio]")).toHaveCount(5);
    await page.goto("/en/about");
    const line = page.getByTestId("social-sentence");
    await expect(line).toHaveText(/^Follow the workshop on Instagram.*, TikTok.* and Facebook.*\.$/);
    await checkLinks(line.locator("a"), { label: false });
  });

  test("order page: mailto with the order message and subject", async ({ page }) => {
    await page.goto("/en");
    const { simple } = await import("./catalog");
    await page.evaluate((slug) => localStorage.setItem("gethsemane.cart.v2", JSON.stringify([{ slug, qty: 1 }])), simple.slug);
    await page.goto("/en/cart");
    await waitForHydration(page);
    const href = (await page.getByTestId("email-order").getAttribute("href"))!;
    expect(href).toMatch(/^mailto:gethsemane\.t12@gmail\.com\?subject=Order%20request&body=/);
    expect(decodeURIComponent(href.split("body=")[1]!)).toContain("Hello Gethsemane");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy message" }).click();
    await expect(page.getByText(/or an email to us|Copying is not available/)).toBeVisible();
  });

  test("security.txt lists the email first", async ({ request }) => {
    const text = await (await request.get("/.well-known/security.txt")).text();
    expect(text.split("\n")[0]).toBe("Contact: mailto:gethsemane.t12@gmail.com");
  });
});

async function socialTargets(page: Page) {
  return page.locator(".social-links a, .footer-email, [data-testid=social-sentence] a, [data-testid=contact-email]").all();
}

test.describe("tap targets and fixed UI", () => {
  test.skip(({ isMobile }) => isMobile, "explicit viewports in the desktop project");

  for (const width of [320, 390, 1280]) {
    test(`social links and email are 44 px targets and never under the bottom nav or language button at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 760 });
      for (const path of ["/en", "/en/contact", "/en/about"]) {
        await page.goto(path);
        await waitForHydration(page);
        for (const el of await socialTargets(page)) {
          if (!(await el.isVisible())) continue;
          await el.scrollIntoViewIfNeeded();
          await page.waitForTimeout(250); // the floating language button steps aside after scrolling
          const box = (await el.boundingBox())!;
          if (!(await el.evaluate((n) => n.closest("[data-testid=social-sentence]")))) {
            expect(box.height, `${path} ${await el.textContent()}`).toBeGreaterThanOrEqual(43.5);
            expect(box.width).toBeGreaterThanOrEqual(43.5);
          }
          const nav = await page.locator(".bottom-nav").boundingBox();
          if (nav && nav.height > 0 && (await page.locator(".bottom-nav").isVisible())) expect(overlaps(box, nav), `${path}: bottom nav covers a link`).toBe(false);
          const fab = page.locator(".lang-fab-button");
          if (await fab.isVisible()) expect(overlaps(box, (await fab.boundingBox())!), `${path}: language button covers a link`).toBe(false);
        }
      }
    });
  }
});

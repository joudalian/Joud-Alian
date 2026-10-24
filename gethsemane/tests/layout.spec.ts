import { expect, test, type Page } from "@playwright/test";
import { fixture, simple, simple2 } from "./catalog";
import { expectNoHorizontalScroll, infoPages, locales, pages, waitForHydration } from "./helpers";

// Layout checks run once per width in the desktop project (the viewport is set explicitly).
const widths = [320, 390, 768, 1024, 1280];
// German and Greek have the longest strings; English is the default.
const layoutLocales = ["en", "de", "el"];

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

// A long order: a simple piece, the fixture with a variant and engraving, and a piece that no longer exists.
const cart = [
  { slug: simple.slug, qty: 2 },
  { slug: fixture.slug, qty: 1, variantId: fixture.variants.at(-1)!.id, engraving: "W".repeat(fixture.engraving!.maxChars) },
  { slug: "a-piece-that-was-removed", qty: 1 },
];
const wishlist = [simple2.slug, fixture.slug];

async function fillCartAndWishlist(page: Page) {
  await page.evaluate(
    ([c, w]) => {
      localStorage.setItem("gethsemane.cart.v2", JSON.stringify(c));
      localStorage.setItem("gethsemane.wishlist.v1", JSON.stringify(w));
    },
    [cart, wishlist] as const,
  );
}

/** Interactive elements that are smaller than 44×44 CSS px (inline links inside text are exempt). */
async function smallTapTargets(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const els = document.querySelectorAll<HTMLElement>("button, select, input, a.btn, .icon-btn, nav a, .lang-menu a, .chips a, .site-footer a");
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width === 0 || style.visibility === "hidden" || el.closest("[hidden]") || el.closest(".skip-link") || el.classList.contains("skip-link")) continue;
      if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  });
}

/** Elements whose text is clipped (content wider than the box while overflow hides it). */
async function clippedText(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("main *, header *, footer *")) {
      // Photos waiting off-screen in the swipeable gallery strip are scrolled into view, not cut off.
      if (el.closest(".sr-only") || el.closest(".gallery-track, .gallery-thumbs")) continue;
      const style = getComputedStyle(el);
      if ((style.overflowX === "hidden" || style.overflow === "hidden") && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0 && el.textContent?.trim()) {
        out.push(`${el.tagName.toLowerCase()}.${el.className} "${el.textContent.trim().slice(0, 40)}"`);
      }
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > document.documentElement.clientWidth + 1 && style.position !== "fixed") {
        out.push(`overflows viewport: ${el.tagName.toLowerCase()}.${el.className}`);
      }
    }
    return out;
  });
}

test.describe("responsive layout", () => {
  test.skip(({ isMobile }) => isMobile, "covered by explicit viewports in the desktop project");

  for (const width of widths) {
    for (const locale of layoutLocales) {
      test(`${locale} at ${width}px: no horizontal scroll, clipping or small tap targets`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`/${locale}`);
        await fillCartAndWishlist(page);
        for (const path of [...Object.values(pages), ...infoPages]) {
          await page.goto(`/${locale}${path}`);
          await waitForHydration(page);
          await expectNoHorizontalScroll(page);
          expect(await clippedText(page), `${path} clipped`).toEqual([]);
          expect(await smallTapTargets(page), `${path} tap targets`).toEqual([]);
        }
        // The open language menu (floating button on desktop, dialog on phones) fits on screen too.
        if (width < 768) await page.getByTestId("language-dialog-button").click();
        else await page.locator(".lang-fab-button").click();
        const menu = await page.locator(width < 768 ? ".language-dialog" : ".lang-menu").boundingBox();
        expect(menu).not.toBeNull();
        expect(menu!.x).toBeGreaterThanOrEqual(0);
        expect(menu!.y).toBeGreaterThanOrEqual(0);
        expect(menu!.x + menu!.width).toBeLessThanOrEqual(width);
        expect(await smallTapTargets(page)).toEqual([]);
      });
    }

    test(`fixed UI never hides content at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto("/de");
      await fillCartAndWishlist(page);
      for (const path of ["", pages.product, pages.fixture, "/cart", "/shop"]) {
        await page.goto(`/de${path}`);
        await waitForHydration(page);
        const header = (await page.locator(".site-header").boundingBox())!;
        await page.waitForTimeout(250);
        const fabVisible = await page.locator(".lang-fab-button").isVisible();
        const fab = (await page.locator(".lang-fab-button").boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
        const bottomNav = await page.locator(".bottom-nav").boundingBox();

        // Initial view: the heading is below the sticky header; primary actions are not under the FAB or bottom nav.
        const h1 = (await page.locator("h1").boundingBox())!;
        expect(h1.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
        const important = page.locator("main .btn, main .stepper button:not(:disabled), #currency-select");
        for (const el of await important.all()) {
          const box = await el.boundingBox();
          if (!box || box.y > 700 || box.y + box.height < 0) continue;
          if (fabVisible) expect(overlaps(box, fab), `${path}: FAB covers ${await el.textContent()}`).toBe(false);
        }

        // Keyboard focus scrolls every control fully into view: never behind the sticky header or the bottom nav.
        for (const el of await page.locator("main .btn:visible, main .stepper button:not(:disabled)").all()) {
          await el.focus();
          const box = (await el.boundingBox())!;
          const headerBox = (await page.locator(".site-header").boundingBox())!;
          expect(box.y, `${path}: header covers a focused control`).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
          if (bottomNav && bottomNav.height > 0) {
            const nav = (await page.locator(".bottom-nav").boundingBox())!;
            expect(box.y + box.height, `${path}: bottom nav covers a focused control`).toBeLessThanOrEqual(nav.y + 1);
          }
          const bar = page.locator(".order-bar:visible");
          if ((await bar.count()) > 0 && !(await el.evaluate((n) => n.closest(".order-bar") !== null))) {
            const barBox = (await bar.boundingBox())!;
            expect(box.y + box.height, `${path}: order bar covers a focused control`).toBeLessThanOrEqual(barBox.y + 1);
          }
        }
        await page.evaluate(() => window.scrollTo(0, 0));

        // Scrolled to the very end: the last footer line is above the bottom nav and not under the FAB.
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(100);
        const lastLine = (await page.locator(".footer-bottom p").last().boundingBox())!;
        const fabNow = await page.locator(".lang-fab-button").boundingBox();
        if (fabNow && (await page.locator(".lang-fab-button").isVisible())) expect(overlaps(lastLine, fabNow)).toBe(false);
        const navNow = await page.locator(".bottom-nav").boundingBox();
        if (navNow && navNow.height > 0) expect(lastLine.y + lastLine.height).toBeLessThanOrEqual(navNow.y);

        // Jumping to a section keeps it clear of the sticky header (scroll-padding).
        await page.locator("main h1").scrollIntoViewIfNeeded();
        await page.evaluate(() => document.querySelector("main h1")?.scrollIntoView({ block: "start" }));
        const h1Now = (await page.locator("main h1").boundingBox())!;
        const headerNow = (await page.locator(".site-header").boundingBox())!;
        expect(h1Now.y).toBeGreaterThanOrEqual(headerNow.y + headerNow.height - 1);
      }
    });
  }
});

test("keyboard: skip link, visible focus and header navigation", async ({ page, isMobile }) => {
  await page.goto("/en/shop");
  await waitForHydration(page);
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
  if (!isMobile) {
    await page.locator(".main-nav a").first().focus();
    const style = await page.locator(".main-nav a").first().evaluate((el) => getComputedStyle(el).outlineWidth);
    expect(parseFloat(style)).toBeGreaterThanOrEqual(2);
  }
});

test("prefers-reduced-motion disables animations", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/en/cart");
  const duration = await page.evaluate(() => {
    const el = document.createElement("div");
    el.className = "spinner";
    document.body.append(el);
    return getComputedStyle(el).animationDuration;
  });
  expect(parseFloat(duration)).toBeLessThan(0.01);
  await context.close();
});

test("the floating language button never sits on top of a control while scrolling", async ({ page }) => {
  test.setTimeout(240_000);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 700 });
    for (const path of ["/el/shop", `/de${pages.product}`, `/de${pages.fixture}`]) {
      await page.goto(path);
      await waitForHydration(page);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += 200) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(220);
        const problem = await page.evaluate(() => {
          const fabEl = document.querySelector<HTMLElement>(".lang-fab-button")!;
          if (getComputedStyle(fabEl).visibility === "hidden") return null;
          const fab = fabEl.getBoundingClientRect();
          for (const el of document.querySelectorAll<HTMLElement>("main button, main a.btn, main select, main .chips a")) {
            const r = el.getBoundingClientRect();
            if (r.width && r.left < fab.right && r.right > fab.left && r.top < fab.bottom && r.bottom > fab.top) return el.textContent;
          }
          return null;
        });
        expect(problem, `${path} at ${width}px, scrollY ${y}`).toBeNull();
      }
    }
  }
});

test.describe("bottom navigation labels", () => {
  test.skip(({ isMobile }) => isMobile, "covered by explicit viewports in the desktop project");

  for (const width of [320, 360, 390]) {
    test(`no label is truncated or overlapping at ${width}px, in all languages`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      const problems: string[] = [];
      for (const locale of locales) {
        await page.goto(`/${locale}/shop`);
        await waitForHydration(page);
        problems.push(
          ...(await page.evaluate((where) => {
            const out: string[] = [];
            const items = [...document.querySelectorAll<HTMLElement>(".bottom-nav > ul > li")].map((li) => li.querySelector<HTMLElement>("a, button")!);
            const boxes = items.map((el) => el.getBoundingClientRect());
            items.forEach((el, i) => {
              const label = el.querySelector<HTMLElement>(".label")!;
              const text = label.textContent ?? "";
              const r = label.getBoundingClientRect();
              const box = boxes[i]!;
              if (label.scrollWidth > label.clientWidth) out.push(`${where}: "${text}" truncated (${label.scrollWidth} > ${label.clientWidth})`);
              if (getComputedStyle(label).textOverflow === "ellipsis") out.push(`${where}: "${text}" uses an ellipsis`);
              if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.bottom > box.bottom + 0.5) out.push(`${where}: "${text}" spills out of its item`);
              if (box.width < 43.5 || box.height < 43.5) out.push(`${where}: "${text}" target ${Math.round(box.width)}×${Math.round(box.height)}`);
              const next = boxes[i + 1];
              if (next && box.right > next.left + 0.5) out.push(`${where}: "${text}" overlaps the next item`);
              // Every item keeps a full accessible name (the visible label or a longer aria-label).
              const name = el.getAttribute("aria-label") ?? el.textContent ?? "";
              if (!name.toLowerCase().includes(text.trim().toLowerCase())) out.push(`${where}: accessible name "${name}" does not contain "${text}"`);
            });
            return out;
          }, `${locale} ${width}px`)),
        );
      }
      expect(problems).toEqual([]);
    });
  }
});

import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { locales } from "../src/i18n/locales";
import { CONTENT_IMAGES } from "../src/lib/content-image-sizes";
import { fixture } from "./catalog";

// The four illustrative (AI-generated) atmosphere images: where they appear, that they load, are described and
// labelled honestly, never shift the layout, never stand in for products, and keep the text over them readable.
test.skip(({ isMobile }) => isMobile, "explicit viewports in the desktop project");
type Imagery = { illustrative: string; heroAlt: string; craftAlt: string; crossAlt: string; pressAlt: string };
const imagery = (locale: string) =>
  (JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), "utf8")) as { imagery: Imagery }).imagery;

const PLACES = [
  { path: "/home", url: "", name: "hero-olive-grove", alt: "heroAlt", caption: false },
  { path: "/home", url: "", name: "craft-workshop", alt: "craftAlt", caption: true },
  { path: "/about", url: "/about", name: "craft-workshop", alt: "craftAlt", caption: true },
  { path: "/about", url: "/about", name: "name-olive-press", alt: "pressAlt", caption: true },
  { path: "/shop", url: "/shop", name: "cross-olive-branch", alt: "crossAlt", caption: false },
] as const;

const image = (page: Page, name: string) => page.locator(`img[data-content-image="${name}"]`);

async function loaded(img: Locator) {
  await img.scrollIntoViewIfNeeded();
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
}

test("every placement renders its image from the sized copies, with localized alt text and caption", async ({ page }) => {
  for (const locale of ["en", "de", "el"] as const) {
    const text = imagery(locale);
    for (const place of PLACES) {
      await page.goto(`/${locale}${place.url}`);
      const img = image(page, place.name);
      await expect(img, `${locale}${place.url} ${place.name}`).toHaveCount(1);
      await expect(img).toHaveAttribute("alt", text[place.alt]);
      await expect(img).toHaveAttribute("width", /^\d+$/);
      await expect(img).toHaveAttribute("height", /^\d+$/);
      await expect(img).toHaveAttribute("sizes", /.+/);
      await loaded(img);
      expect(await img.evaluate((i: HTMLImageElement) => i.currentSrc)).toMatch(new RegExp(`/images/content/sized/${place.name}-\\d+\\.(avif|webp)$`));
      const caption = page.getByTestId(`figure-${place.name}`).locator("figcaption");
      if (place.caption) await expect(caption).toHaveText(text.illustrative);
      else await expect(caption).toHaveCount(0);
    }
  }
});

test("alt texts and the caption exist in every language and differ from English", () => {
  const en = imagery("en");
  for (const locale of locales) {
    const text = imagery(locale);
    for (const key of Object.keys(en) as (keyof Imagery)[]) {
      expect(text[key], `${locale} imagery.${key}`).toBeTruthy();
      if (locale !== "en") expect(text[key], `${locale} imagery.${key}`).not.toBe(en[key]);
    }
  }
});

test("only the hero is a priority image; the others are lazy", async ({ page }) => {
  await page.goto("/en");
  const hero = image(page, "hero-olive-grove");
  await expect(hero).toHaveAttribute("fetchpriority", "high");
  await expect(hero).toHaveAttribute("loading", "eager");
  await expect(hero).toHaveAttribute("sizes", "100vw");
  // Preloaded in <head> with the same candidates.
  await expect(page.locator('head link[rel="preload"][as="image"][imagesrcset*="hero-olive-grove"]')).toHaveCount(1);
  await expect(image(page, "craft-workshop")).toHaveAttribute("loading", "lazy");
  await expect(page.locator('img[fetchpriority="high"]')).toHaveCount(1);
  for (const path of ["/en/about", "/en/shop"]) {
    await page.goto(path);
    for (const img of await page.locator("img[data-content-image]").all()) {
      await expect(img).toHaveAttribute("loading", "lazy");
      await expect(img).not.toHaveAttribute("fetchpriority", "high");
    }
  }
});

test("the images do not shift the layout when they load", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["/en", "/en/about", "/en/shop"]) {
      await page.goto(path);
      for (const img of await page.locator("img[data-content-image]").all()) {
        // The box is reserved before the file arrives (lazy images below the fold have not loaded yet).
        const before = (await img.boundingBox())!;
        expect(before.height, `${path} at ${width}px`).toBeGreaterThan(100);
        await loaded(img);
        const after = (await img.boundingBox())!;
        expect(Math.abs(after.height - before.height), `${path} at ${width}px`).toBeLessThan(1);
        expect(Math.abs(after.width - before.width), `${path} at ${width}px`).toBeLessThan(1);
      }
      const shift = await page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            let total = 0;
            new PerformanceObserver((list) => {
              for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) total += e.value;
            }).observe({ type: "layout-shift", buffered: true });
            setTimeout(() => resolve(total), 300);
          }),
      );
      expect(shift, `${path} at ${width}px: cumulative layout shift`).toBeLessThan(0.02);
    }
  }
});

/** Relative luminance of an sRGB colour (0–255 channels). */
const luminance = (r: number, g: number, b: number) =>
  [r, g, b].map((c) => c / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);

test("text over the images keeps WCAG AA contrast against the brightest pixel behind it", async ({ page }) => {
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [path, section] of [["/en", ".hero"], ["/en/shop", ".image-band"]] as const) {
      await page.goto(path);
      const box = page.locator(section);
      await loaded(box.locator("img"));
      // Text boxes relative to the section (independent of scrolling), with their colour and size.
      const measured = await box.evaluate((section) => {
        const origin = section.getBoundingClientRect();
        return Array.from(section.querySelectorAll<HTMLElement>("h1, h2, p, .eyebrow")).map((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return {
            x: r.left - origin.left,
            y: r.top - origin.top,
            w: r.width,
            h: r.height,
            color: s.color,
            size: parseFloat(s.fontSize),
            weight: Number(s.fontWeight),
            label: (el.textContent ?? "").slice(0, 30),
          };
        });
      });
      expect(measured.length).toBeGreaterThan(1);
      // Photograph the background alone: hide the text and any fixed UI, keep everything else.
      await page.evaluate((sel) => {
        document.querySelectorAll<HTMLElement>(`${sel} :is(h1, h2, p, .eyebrow, .btn), .bottom-nav, .lang-fab, .lang-fab-button, .site-header`).forEach((t) => (t.style.visibility = "hidden"));
      }, section);
      const { data, info } = await sharp(await box.screenshot()).raw().toBuffer({ resolveWithObject: true });
      for (const m of measured) {
        const [fr, fg, fb] = m.color.match(/\d+/g)!.map(Number) as [number, number, number];
        const fgL = luminance(fr, fg, fb);
        let worst = Infinity;
        for (let y = Math.max(0, Math.floor(m.y)); y < Math.min(info.height, m.y + m.h); y++) {
          for (let x = Math.max(0, Math.floor(m.x)); x < Math.min(info.width, m.x + m.w); x++) {
            const i = (y * info.width + x) * info.channels;
            const bgL = luminance(data[i]!, data[i + 1]!, data[i + 2]!);
            worst = Math.min(worst, (Math.max(fgL, bgL) + 0.05) / (Math.min(fgL, bgL) + 0.05));
          }
        }
        const large = m.size >= 24 || (m.size >= 18.66 && m.weight >= 700);
        expect(worst, `${path} ${section} at ${width}px: "${m.label}"`).toBeGreaterThanOrEqual(large ? 3 : 4.5);
      }
    }
  }
});

test("the images are never product data: no product pages, JSON-LD or Open Graph use them, originals are not served", async ({ page, request }) => {
  for (const path of [`/en/product/${fixture.slug}`, "/en/shop/crosses", "/en/cart"]) {
    const html = await (await request.get(path)).text();
    expect(html, path).not.toContain("/images/content/");
  }
  for (const path of ["/en", "/en/about", "/en/shop"]) {
    await page.goto(path);
    for (const ld of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(ld, path).not.toContain("/images/content/");
    for (const meta of await page.locator('meta[property^="og:"], meta[name^="twitter:"]').all()) {
      expect((await meta.getAttribute("content")) ?? "", path).not.toContain("/images/content/");
    }
  }
  for (const name of Object.keys(CONTENT_IMAGES)) {
    for (const url of [`/content-images/${name}.jpg`, `/${name}.jpg`, `/images/content/${name}.jpg`]) {
      expect((await request.get(url)).status(), url).toBe(404);
    }
  }
});

test("no wording about our own workshop sits next to the illustrative images", async ({ page }) => {
  for (const path of ["/en", "/en/about", "/en/shop"]) {
    await page.goto(path);
    for (const img of await page.locator("img[data-content-image]").all()) {
      // The closest section-level container and its text.
      const nearby = await img.evaluate((el) => (el.closest("figure")?.parentElement ?? el.closest("section"))!.textContent ?? "");
      expect(nearby, path).not.toMatch(/\bour (workshop|trees|olive trees|garden|press)\b/i);
    }
  }
});

import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { catalogLanguageIssues, parseCatalog } from "../src/data/catalog-schema";
import { locales } from "../src/i18n/locales";
import { PRODUCT_IMAGE_WIDTHS } from "../src/lib/product-image-sizes";
import { categories, fixture, nameOf, price, priceOf, products, seedCart, simple } from "./catalog";
import { pages, waitForHydration } from "./helpers";

const waText = (href: string | null) => decodeURIComponent(new URL(href ?? "").searchParams.get("text") ?? "");
const category = { slug: "crosses", order: 1, text: { en: { name: "Crosses", description: "Crosses." } } };
const valid = { id: 1, slug: "a-piece", categories: ["crosses"], priceUsd: 10, images: [{ file: "a-piece/01.jpg", width: 10, height: 10 }], text: { en: { name: "A", description: "B" } } };

test.describe("catalog data (no browser)", () => {
  test.skip(({ isMobile }) => isMobile, "run once");

  test("defaults are applied and missing languages are listed for review", () => {
    const { products: [p], problems } = parseCatalog({ categories: [category], products: [valid] }, locales);
    expect(problems).toEqual([]);
    expect(p!.sku).toBe("GTH-001");
    expect(p!.availability).toBe("made_to_order");
    expect(p!.variants).toEqual([]);
    expect(p!.needsReview).toEqual(locales.filter((l) => l !== "en"));
  });

  test("mistakes in the data are reported, not rendered", () => {
    const bad = [
      { ...valid, categories: ["nope"] },
      { ...valid, id: 2, slug: "b", compareAtUsd: 5 },
      { ...valid, id: 3, slug: "c", text: { fr: { name: "A", description: "B" } } },
      { ...valid, id: 4, slug: "a-piece" },
      { ...valid, id: 5, slug: "d", images: [{ file: "../secret.jpg", width: 1, height: 1 }] },
      { ...valid, id: 6, slug: "e", variants: [{ id: "x", label: { fr: "X" } }, { id: "x", label: { en: "Y" } }] },
      { ...valid, id: 7, slug: "f", categorys: ["crosses"] },
    ];
    const { problems } = parseCatalog({ categories: [category], products: [valid, ...bad] }, locales);
    for (const expected of [/unknown category "nope"/, /compareAtUsd must be higher/, /English text is required/, /duplicate slug/, /images\.0\.file/, /duplicate variant id/, /English label is required/, /categorys/]) {
      expect(problems.join("\n")).toMatch(expected);
    }
  });

  test("check:i18n is strict for launchReady products and only warns for the others", () => {
    const catalog = parseCatalog({ categories: [category], products: [valid, { ...valid, id: 2, slug: "ready", launchReady: true }] }, locales);
    const { errors, warnings } = catalogLanguageIssues(catalog, locales);
    expect(errors.join("\n")).toContain('"ready"');
    expect(errors.join("\n")).not.toContain('"a-piece"');
    expect(warnings.join("\n")).toContain('"a-piece"');
  });

  test("the real catalog is valid and every product's categories exist", () => {
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) for (const c of p.categories) expect(categories.map((x) => x.slug)).toContain(c);
  });

  test("the CSV importer validates rows against the schema and reads photo sizes", () => {
    const dir = mkdtempSync(join(tmpdir(), "import-"));
    try {
      const template = readFileSync("docs/templates/products.csv", "utf8").split("\n");
      const header = template[0]!.split(",");
      const row = (values: Record<string, string>) => header.map((h) => JSON.stringify(values[h] ?? "")).join(",");
      const good = {
        id: "990",
        slug: "imported-test-piece",
        categories: categories[0]!.slug,
        price_usd: "12",
        photos: simple.images[0]!.file,
        name_en: "Imported piece",
        description_en: "Imported for a test.",
      };
      const csv = join(dir, "ok.csv");
      writeFileSync(csv, `${template[0]}\n${row(good)}\n`);
      const out = execFileSync("node", ["scripts/import-products.mjs", csv], { encoding: "utf8" });
      expect(out).toContain('"slug": "imported-test-piece"');
      expect(out).toContain(`"width": ${simple.images[0]!.width}`);
      const badCsv = join(dir, "bad.csv");
      writeFileSync(badCsv, `${template[0]}\n${row({ ...good, categories: "no-such-category" })}\n`);
      expect(() => execFileSync("node", ["scripts/import-products.mjs", badCsv], { stdio: "pipe" })).toThrow(/unknown category/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the photo pipeline strips EXIF/GPS, caps originals at 2000 px and writes every width", async () => {
    const dir = mkdtempSync(join(tmpdir(), "photos-"));
    try {
      const src = join(dir, "src", "piece");
      const out = join(dir, "out");
      execFileSync("mkdir", ["-p", src]);
      await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#c8b38a" } })
        .withExif({ IFD0: { Make: "Phone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "31/1 42/1 0/1" } })
        .jpeg()
        .toFile(join(src, "01.jpg"));
      expect((await sharp(join(src, "01.jpg")).metadata()).exif).toBeTruthy();
      execFileSync("node", ["scripts/size-product-images.mjs", "--src", join(dir, "src"), "--out", out, "--no-data"], { stdio: "pipe" });
      const meta = await sharp(join(src, "01.jpg")).metadata();
      expect(meta.exif).toBeUndefined();
      expect(Math.max(meta.width!, meta.height!)).toBe(2000);
      const files = readdirSync(join(out, "piece")).sort();
      for (const w of PRODUCT_IMAGE_WIDTHS) expect(files).toEqual(expect.arrayContaining([`01-${w}.avif`, `01-${w}.webp`]));
      expect(files).toContain("01-og.jpg");
      const og = await sharp(join(out, "piece", "01-og.jpg")).metadata();
      expect([og.width, og.height]).toEqual([1200, 630]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

test.describe("fixture product page", () => {
  test("gallery: every photo with its alt text, keyboard and buttons move between them", async ({ page, isMobile }) => {
    await page.goto(`/en${pages.fixture}`);
    await waitForHydration(page);
    const gallery = page.getByTestId("gallery");
    const slides = gallery.locator(".gallery-slide img");
    await expect(slides).toHaveCount(fixture.images.length);
    for (const [i, image] of fixture.images.entries()) {
      const alt = image.alt.en ?? (i === 0 ? `${nameOf(fixture)}, handmade from olive wood` : `${nameOf(fixture)}, photo ${i + 1}`);
      await expect(slides.nth(i)).toHaveAttribute("alt", alt);
      // Served from the pre-sized copies, never the original.
      expect(await slides.nth(i).getAttribute("srcset")).toContain("/images/products/sized/");
    }
    const thumbs = gallery.locator(".gallery-thumb");
    await expect(thumbs.first()).toHaveAttribute("aria-current", "true");
    if (isMobile) {
      // Swipe: scrolling the strip by one width selects the next photo.
      await gallery.locator(".gallery-track").evaluate((el) => el.scrollTo({ left: el.clientWidth }));
      await expect(thumbs.nth(1)).toHaveAttribute("aria-current", "true");
    } else {
      await gallery.locator(".gallery-track").focus();
      await page.keyboard.press("ArrowRight");
      await expect(thumbs.nth(1)).toHaveAttribute("aria-current", "true");
      await page.keyboard.press("End");
      await expect(thumbs.last()).toHaveAttribute("aria-current", "true");
      await page.getByRole("button", { name: "Next photo" }).click();
      await expect(thumbs.first()).toHaveAttribute("aria-current", "true");
    }
  });

  test("variant, engraving and sale price drive the price, the order and the message", async ({ page }) => {
    await page.goto(`/en${pages.fixture}`);
    await waitForHydration(page);
    const [first, last] = [fixture.variants[0]!, fixture.variants.at(-1)!];
    const priceBox = page.getByTestId("product-price");
    await expect(priceBox).toContainText(price(priceOf(fixture, first.id)));
    if (fixture.compareAtUsd) await expect(priceBox.locator("s")).toContainText(price(fixture.compareAtUsd));
    await expect(page.getByTestId("availability")).toHaveText("Made to order");
    if (fixture.leadTimeDays) await expect(page.locator(".availability")).toContainText(`${fixture.leadTimeDays} days`);

    await page.getByRole("radio", { name: new RegExp(last.label.en) }).check();
    await expect(priceBox).toContainText(price(priceOf(fixture, last.id)));
    await page.getByLabel(/Add engraving/).check();
    // Without text, nothing can be ordered yet.
    await expect(page.locator(".buy-row button").first()).toBeDisabled();
    const input = page.getByLabel("Engraving text");
    await input.fill("X".repeat(fixture.engraving!.maxChars + 5));
    await expect(input).toHaveValue("X".repeat(fixture.engraving!.maxChars));
    await expect(page.locator(".engraving-count")).toHaveText(`${fixture.engraving!.maxChars}/${fixture.engraving!.maxChars}`);
    await input.fill("Anna 2026");
    await expect(priceBox).toContainText(price(priceOf(fixture, last.id, true)));
    await expect(page.locator(".engraving-hint")).toContainText("cannot be returned unless faulty");

    const order = waText(await page.locator("#order-row [data-testid=whatsapp-order]").getAttribute("href"));
    expect(order).toContain(`1 × ${nameOf(fixture)}, ${last.label.en}`);
    expect(order).toContain(last.sku);
    expect(order).toContain("Engraving: “Anna 2026”");

    await page.locator(".buy-row button").first().click();
    await page.getByTestId("view-order").click();
    await expect(page.locator(".line-detail")).toHaveText([last.label.en, "Engraving: “Anna 2026”"]);
    await expect(page.locator(".subtotal-usd")).toHaveText(price(priceOf(fixture, last.id, true)));
    await expect(page.getByTestId("message-preview")).toHaveValue(/Engraving: “Anna 2026”/);
  });

  test("Open Graph: product type and the product's own image", async ({ page, request }) => {
    await page.goto(`/en${pages.fixture}`);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "product");
    await expect(page.locator('meta[property="og:type"]')).toHaveCount(1);
    const og = await page.locator('meta[property="og:image"]').first().getAttribute("content");
    expect(og).toMatch(/\/images\/products\/sized\/.+-og\.jpg$/);
    const res = await request.get(new URL(og!).pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/jpeg");
  });

  test("missing languages fall back to English, marked as English", async ({ page }) => {
    const missing = locales.find((l) => !fixture.text[l])!;
    await page.goto(`/${missing}${pages.fixture}`);
    await expect(page.locator("h1")).toHaveText(nameOf(fixture));
    await expect(page.locator("h1")).toHaveAttribute("lang", "en");
  });

  test("cards: pieces with options link to the product page; prices come from the data", async ({ page }) => {
    await page.goto(`/en/shop/${fixture.categories[0]}`);
    const card = page.locator(".product-card", { has: page.getByRole("heading", { name: nameOf(fixture) }) });
    await expect(card.getByRole("link", { name: `Choose options: ${nameOf(fixture)}` })).toHaveAttribute("href", `/en${pages.fixture}`);
    // A product listed in several categories appears in each.
    for (const c of fixture.categories) {
      await page.goto(`/en/shop/${c}`);
      await expect(page.getByRole("heading", { name: nameOf(fixture) })).toBeVisible();
    }
  });
});

test.describe("order storage", () => {
  test("a v1 order is migrated to v2 and removed products are shown as no longer available", async ({ page }) => {
    await page.goto("/en");
    await page.evaluate((slug) => {
      localStorage.removeItem("gethsemane.cart.v2");
      localStorage.setItem("gethsemane.cart.v1", JSON.stringify([{ slug, qty: 2 }, { slug: "a-piece-that-was-removed", qty: 1 }]));
    }, simple.slug);
    await page.goto("/en/cart");
    await waitForHydration(page);
    await expect(page.locator(".line")).toHaveCount(2);
    await expect(page.getByTestId("line-unavailable")).toContainText("no longer available");
    const stored = await page.evaluate(() => [localStorage.getItem("gethsemane.cart.v2"), localStorage.getItem("gethsemane.cart.v1")]);
    expect(JSON.parse(stored[0]!)).toEqual([{ slug: simple.slug, qty: 2 }, { slug: "a-piece-that-was-removed", qty: 1 }]);
    expect(stored[1]).toBeNull();
    // Only orderable pieces are counted and sent.
    await expect(page.getByTestId("message-preview")).not.toHaveValue(/removed/);
    await page.getByTestId("line-unavailable").getByRole("button", { name: /Remove/ }).click();
    await expect(page.locator(".line")).toHaveCount(1);
  });

  test("the same piece with another variant or engraving is a separate line", async ({ page }) => {
    const [a, b] = [fixture.variants[0]!.id, fixture.variants.at(-1)!.id];
    await seedCart(page, [
      { slug: fixture.slug, qty: 1, variantId: a },
      { slug: fixture.slug, qty: 1, variantId: b },
      { slug: fixture.slug, qty: 1, variantId: b, engraving: "Anna" },
      { slug: fixture.slug, qty: 2, variantId: b, engraving: "  Anna " },
    ]);
    await page.goto("/en/cart");
    await waitForHydration(page);
    await expect(page.locator(".line")).toHaveCount(3);
    await expect(page.locator(".line input[type=number]").last()).toHaveValue("3");
  });
});

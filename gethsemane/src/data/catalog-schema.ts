/**
 * Validation and defaults for the catalog data (src/data/categories.ts, src/data/products.ts).
 *
 * The data files hold plain values only; this module checks them with zod and fills in defaults, so a typo in
 * the data fails the build (and `npm run check:i18n`) with a readable message instead of breaking a page.
 * It imports nothing from the app, so Node scripts can use it directly (`node scripts/…` with type stripping).
 */
import { z } from "zod/mini";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FILE = /^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*\.(jpe?g|png|webp|avif)$/;

const text = (max: number) => z.string().check(z.minLength(1), z.maxLength(max), z.trim());
const money = z.number().check(z.positive());

export const productTextSchema = z.strictObject({
  name: text(120),
  /** One or two sentences: the lead on the product page. Optional. */
  summary: z.optional(text(300)),
  description: text(4000),
});

const imageSchema = z.strictObject({
  /** Path inside catalog/photos/, e.g. "salad-bowl/01.jpg". */
  file: z.string().check(z.regex(FILE)),
  width: z.int().check(z.positive()),
  height: z.int().check(z.positive()),
  /** Alt text per language; missing languages use "<name>, handmade from olive wood". */
  alt: z.optional(z.record(z.string(), text(200))),
});

const variantSchema = z.strictObject({
  id: z.string().check(z.regex(SLUG)),
  label: z.record(z.string(), text(60)),
  sizeCm: z.optional(z.tuple([money, money, money])),
  weightG: z.optional(money),
  priceUsd: z.optional(money),
  sku: z.optional(z.string().check(z.regex(/^[A-Z0-9-]{3,32}$/))),
});

export const productSchema = z.strictObject({
  id: z.int().check(z.positive()),
  slug: z.string().check(z.regex(SLUG), z.maxLength(80)),
  /** Defaults to "GTH-" + the id with three digits, e.g. GTH-007. */
  sku: z.optional(z.string().check(z.regex(/^[A-Z0-9-]{3,32}$/))),
  /** One or more category slugs from src/data/categories.ts; the first is the main one (breadcrumbs). */
  categories: z.array(z.string().check(z.regex(SLUG))).check(z.minLength(1)),
  priceUsd: money,
  /** A previous, higher price. A struck-through price is shown only when this is set. */
  compareAtUsd: z.optional(money),
  /** Defaults to "made_to_order". */
  availability: z.optional(z.enum(["in_stock", "made_to_order", "sold_out"])),
  /** Days to make or prepare the piece before dispatch, shown with "made to order". */
  leadTimeDays: z.optional(z.int().check(z.positive(), z.maximum(180))),
  variants: z.optional(z.array(variantSchema)),
  engraving: z.optional(
    z.strictObject({ enabled: z.boolean(), maxChars: z.int().check(z.positive(), z.maximum(200)), extraUsd: z.number().check(z.gte(0)) }),
  ),
  /** Photos; the first one is the main photo (cards, cart, social sharing). */
  images: z.array(imageSchema).check(z.minLength(1)),
  featured: z.optional(z.boolean()),
  sizeCm: z.optional(z.tuple([money, money, money])),
  weightG: z.optional(money),
  wood: z.optional(z.literal("olive")),
  finish: z.optional(z.enum(["natural", "oiled", "waxed"])),
  packaging: z.optional(z.enum(["giftBox", "box", "pouch"])),
  giftNote: z.optional(z.boolean()),
  tags: z.optional(z.array(z.string().check(z.regex(SLUG)))),
  /** Ready to sell: every language checked. `npm run check:i18n` is strict for these products. */
  launchReady: z.optional(z.boolean()),
  /** Languages whose text exists but still needs a native check (e.g. machine translated). */
  needsReview: z.optional(z.array(z.string())),
  /** Name and description; English is required, other languages fall back to English until added. */
  text: z.record(z.string(), productTextSchema),
});

export const categorySchema = z.strictObject({
  slug: z.string().check(z.regex(SLUG)),
  /** Position in lists (lowest first). */
  order: z.int(),
  /** Banner image inside /public (generated card when the file is missing: `npm run assets`). */
  image: z.optional(z.string().check(z.regex(/^\/[\w\-/.]+\.(webp|jpe?g|png|avif)$/))),
  /** Gift ideas on the home page this category belongs to. */
  gifts: z.optional(z.array(z.enum(["christmas", "faith", "home", "far"]))),
  needsReview: z.optional(z.array(z.string())),
  text: z.record(z.string(), z.strictObject({ name: text(60), description: text(300) })),
});

export type ProductInput = z.input<typeof productSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
export type ProductText = z.output<typeof productTextSchema>;
export type Availability = "in_stock" | "made_to_order" | "sold_out";
type Localized<T> = { en: T } & Partial<Record<string, T>>;

export type ProductImage = { file: string; width: number; height: number; alt: Partial<Record<string, string>> };
export type ProductVariant = {
  id: string;
  label: Localized<string>;
  sizeCm?: [number, number, number];
  weightG?: number;
  priceUsd?: number;
  sku: string;
};
export type Product = {
  id: number;
  slug: string;
  sku: string;
  categories: string[];
  priceUsd: number;
  compareAtUsd?: number;
  availability: Availability;
  leadTimeDays?: number;
  variants: ProductVariant[];
  engraving?: { enabled: boolean; maxChars: number; extraUsd: number };
  images: ProductImage[];
  featured: boolean;
  sizeCm?: [number, number, number];
  weightG?: number;
  wood?: "olive";
  finish?: "natural" | "oiled" | "waxed";
  packaging?: "giftBox" | "box" | "pouch";
  giftNote?: boolean;
  tags: string[];
  launchReady: boolean;
  /** Languages that fall back to English or are marked for review (computed + from the data). */
  needsReview: string[];
  text: Localized<ProductText>;
  /** Fixture products exist only in test builds. */
  fixture: boolean;
};
export type Category = {
  slug: string;
  order: number;
  image: string;
  gifts: string[];
  needsReview: string[];
  text: Localized<{ name: string; description: string }>;
};

function issues(error: { issues: { path: PropertyKey[]; message: string }[] }, where: string) {
  return error.issues.map((i) => `${where}${i.path.length ? `.${i.path.map(String).join(".")}` : ""}: ${i.message}`);
}

/**
 * Validates categories and products, applies defaults and checks cross-references (unique ids, slugs and SKUs,
 * known categories, variant ids, prices). Returns the parsed catalog and the list of problems (empty when valid).
 */
export function parseCatalog(
  input: { categories: readonly unknown[]; products: readonly unknown[]; fixtures?: readonly unknown[] },
  locales: readonly string[],
) {
  const problems: string[] = [];
  const localeSet = new Set(locales);
  const missingLocales = (record: Record<string, unknown>) => locales.filter((l) => !(l in record));
  const unknownLocales = (record: Record<string, unknown>, where: string) => {
    for (const key of Object.keys(record)) if (!localeSet.has(key)) problems.push(`${where}: unknown language "${key}"`);
  };

  const categories: Category[] = [];
  for (const [i, raw] of input.categories.entries()) {
    const where = `category #${i + 1}`;
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) {
      problems.push(...issues(parsed.error, where));
      continue;
    }
    const c = parsed.data;
    const at = `category "${c.slug}"`;
    if (!c.text.en) problems.push(`${at}: English text is required`);
    unknownLocales(c.text, `${at}.text`);
    if (categories.some((x) => x.slug === c.slug)) problems.push(`${at}: duplicate slug`);
    categories.push({
      slug: c.slug,
      order: c.order,
      image: c.image ?? `/images/categories/${c.slug}.webp`,
      gifts: c.gifts ?? [],
      needsReview: [...new Set([...missingLocales(c.text), ...(c.needsReview ?? [])])],
      text: c.text as Category["text"],
    });
  }
  categories.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
  const categorySlugs = new Set(categories.map((c) => c.slug));

  const products: Product[] = [];
  const all = [...input.products.map((p) => [p, false] as const), ...(input.fixtures ?? []).map((p) => [p, true] as const)];
  for (const [i, [raw, fixture]] of all.entries()) {
    const where = `${fixture ? "fixture" : "product"} #${i + 1}`;
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      problems.push(...issues(parsed.error, where));
      continue;
    }
    const p = parsed.data;
    const at = `product "${p.slug}"`;
    if (!p.text.en) problems.push(`${at}: English text is required`);
    unknownLocales(p.text, `${at}.text`);
    for (const c of p.categories) if (!categorySlugs.has(c)) problems.push(`${at}: unknown category "${c}" (add it to src/data/categories.ts)`);
    if (p.compareAtUsd !== undefined && p.compareAtUsd <= p.priceUsd) problems.push(`${at}: compareAtUsd must be higher than priceUsd`);
    for (const r of p.needsReview ?? []) if (!localeSet.has(r)) problems.push(`${at}.needsReview: unknown language "${r}"`);
    const sku = p.sku ?? `GTH-${String(p.id).padStart(3, "0")}`;
    const variants: ProductVariant[] = (p.variants ?? []).map((v, n) => {
      if (!v.label.en) problems.push(`${at}.variants.${n}: English label is required`);
      unknownLocales(v.label, `${at}.variants.${n}.label`);
      return { ...v, label: v.label as ProductVariant["label"], sku: v.sku ?? `${sku}-${v.id.toUpperCase()}` };
    });
    if (new Set(variants.map((v) => v.id)).size !== variants.length) problems.push(`${at}: duplicate variant id`);
    if (products.some((x) => x.id === p.id)) problems.push(`${at}: duplicate id ${p.id}`);
    if (products.some((x) => x.slug === p.slug)) problems.push(`${at}: duplicate slug`);
    const skus = [sku, ...variants.map((v) => v.sku)];
    for (const s of skus) if (products.some((x) => x.sku === s || x.variants.some((v) => v.sku === s))) problems.push(`${at}: duplicate SKU ${s}`);
    for (const [n, image] of p.images.entries()) if (image.alt) unknownLocales(image.alt, `${at}.images.${n}.alt`);
    products.push({
      id: p.id,
      slug: p.slug,
      sku,
      categories: p.categories,
      priceUsd: p.priceUsd,
      compareAtUsd: p.compareAtUsd,
      availability: p.availability ?? "made_to_order",
      leadTimeDays: p.leadTimeDays,
      variants,
      engraving: p.engraving,
      images: p.images.map((img) => ({ file: img.file, width: img.width, height: img.height, alt: img.alt ?? {} })),
      featured: p.featured ?? false,
      sizeCm: p.sizeCm,
      weightG: p.weightG,
      wood: p.wood,
      finish: p.finish,
      packaging: p.packaging,
      giftNote: p.giftNote,
      tags: p.tags ?? [],
      launchReady: p.launchReady ?? false,
      needsReview: [...new Set([...missingLocales(p.text), ...(p.needsReview ?? [])])],
      text: p.text as Product["text"],
      fixture,
    });
  }
  return { categories, products, problems };
}

/**
 * Translation rules for `npm run check:i18n`: a product flagged launchReady must have every language written and
 * none marked for review (errors); for other products and for categories a missing language is a warning only,
 * since the site shows English until the translation is added. Fixtures are never reported.
 */
export function catalogLanguageIssues(catalog: { products: Product[]; categories: Category[] }, locales: readonly string[]) {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const p of catalog.products) {
    if (p.fixture) continue;
    if (p.needsReview.length) {
      const message = `product "${p.slug}": ${p.needsReview.join(", ")} text missing or marked for review (English is shown meanwhile)`;
      if (p.launchReady) errors.push(`${message}; not allowed for a launchReady product`);
      else warnings.push(message);
    }
    if (p.launchReady) {
      for (const v of p.variants) for (const l of locales) if (!v.label[l]) errors.push(`product "${p.slug}": variant "${v.id}" has no ${l} label`);
    }
  }
  for (const c of catalog.categories) {
    if (c.needsReview.length) warnings.push(`category "${c.slug}": ${c.needsReview.join(", ")} text missing or marked for review`);
  }
  return { errors, warnings };
}

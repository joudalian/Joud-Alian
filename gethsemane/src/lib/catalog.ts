import { categories as categoryData } from "@/data/categories";
import { parseCatalog, type Category, type Product, type ProductImage, type ProductText, type ProductVariant } from "@/data/catalog-schema";
import { fixtures } from "@/data/fixtures";
import { products as productData } from "@/data/products";
import { defaultLocale, locales, type Locale } from "@/i18n/locales";

// The catalog data lives in src/data/ (categories.ts, products.ts); this module validates it once and adds
// lookups. Test fixtures are included only in builds made with NEXT_PUBLIC_CATALOG_FIXTURES=1.
const parsed = parseCatalog(
  { categories: categoryData, products: productData, fixtures: process.env.NEXT_PUBLIC_CATALOG_FIXTURES === "1" ? fixtures : [] },
  locales,
);
if (parsed.problems.length) throw new Error(`Invalid catalog data:\n- ${parsed.problems.join("\n- ")}`);

export type { Category, Product, ProductImage, ProductText, ProductVariant };
export type ProductSlug = string;
export type CategorySlug = string;

export const categories: readonly Category[] = parsed.categories;
export const products: readonly Product[] = parsed.products;
export const categorySlugs: readonly string[] = categories.map((c) => c.slug);
export const productSlugs: readonly string[] = products.map((p) => p.slug);

const bySlug = new Map(products.map((p) => [p.slug, p]));
const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

export function getProduct(slug: string): Product | undefined {
  return bySlug.get(slug);
}

export function isProductSlug(value: unknown): value is ProductSlug {
  return typeof value === "string" && bySlug.has(value);
}

export function getCategory(slug: string): Category | undefined {
  return categoryBySlug.get(slug);
}

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === "string" && categoryBySlug.has(value);
}

/** Products listed in a category (a product can be in several). */
export function productsInCategory(category: CategorySlug): Product[] {
  return products.filter((p) => p.categories.includes(category));
}

/** The product's text in `locale`, or English while that language is missing; `lang` says which was used. */
export function productText(product: Product, locale: Locale): ProductText & { lang: Locale } {
  const own = product.text[locale];
  return own ? { ...own, lang: locale } : { ...product.text.en, lang: defaultLocale };
}

export function categoryText(category: Category, locale: Locale): { name: string; description: string; lang: Locale } {
  const own = category.text[locale];
  return own ? { ...own, lang: locale } : { ...category.text.en, lang: defaultLocale };
}

/** The main category (the first one listed), used for breadcrumbs. */
export function mainCategory(product: Product): Category {
  return categoryBySlug.get(product.categories[0]!)!;
}

export function getVariant(product: Product, variantId: string | undefined): ProductVariant | undefined {
  return variantId ? product.variants.find((v) => v.id === variantId) : undefined;
}

export function variantLabel(variant: ProductVariant, locale: Locale): string {
  return variant.label[locale] ?? variant.label.en;
}

/** SKU of the piece, or of the chosen variant. */
export function productSku(product: Product, variantId?: string): string {
  return getVariant(product, variantId)?.sku ?? product.sku;
}

/** Price of one piece in USD: the variant's price if it has one, plus engraving when requested. */
export function unitPriceUsd(product: Product, variantId?: string, engraved = false): number {
  const base = getVariant(product, variantId)?.priceUsd ?? product.priceUsd;
  return base + (engraved && product.engraving?.enabled ? product.engraving.extraUsd : 0);
}

/** Lowest price among the piece and its variants ("from" price on cards). */
export function fromPriceUsd(product: Product): number {
  return Math.min(product.priceUsd, ...product.variants.map((v) => v.priceUsd ?? product.priceUsd));
}

/** True when variants cost different amounts (prices are then shown as "from …"). */
export function hasPriceRange(product: Product): boolean {
  return product.variants.some((v) => (v.priceUsd ?? product.priceUsd) !== product.priceUsd);
}

export function mainImage(product: Product): ProductImage {
  return product.images[0]!;
}

/** Alt text of a photo in `locale`, if the data provides one (English as fallback). */
export function imageAlt(image: ProductImage, locale: Locale): string | undefined {
  return image.alt[locale] ?? image.alt.en;
}

/** "Complete the set": the products listed in relatedSkus, in that order, skipping sold-out ones. */
export function relatedProducts(product: Product): Product[] {
  return product.relatedSkus
    .map((sku) => products.find((p) => p.sku === sku))
    .filter((p): p is Product => Boolean(p) && p!.availability !== "sold_out");
}

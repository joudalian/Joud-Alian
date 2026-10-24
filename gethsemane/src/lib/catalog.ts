import type { Locale } from "@/i18n/locales";
import { categorySlugs, products, type CategorySlug, type ProductRecord, type ProductText } from "@/data/products";

// Product data lives in src/data/products.ts; this module only adds lookups.
export { categorySlugs, products };
export type { CategorySlug, ProductRecord, ProductText };
export type Product = ProductRecord;
export type ProductSlug = (typeof products)[number]["slug"];
export const productSlugs: readonly ProductSlug[] = products.map((p) => p.slug);

const bySlug = new Map<string, Product>(products.map((p) => [p.slug, p]));

export function getProduct(slug: string): Product | undefined {
  return bySlug.get(slug);
}

export function isProductSlug(value: unknown): value is ProductSlug {
  return typeof value === "string" && bySlug.has(value);
}

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === "string" && (categorySlugs as readonly string[]).includes(value);
}

export function productsInCategory(category: CategorySlug): Product[] {
  return products.filter((p) => p.category === category);
}

export function productText(product: Product, locale: Locale): ProductText {
  return product.text[locale];
}

export function categoryImage(slug: CategorySlug): string {
  return `/images/categories/${slug}.webp`;
}

export const categorySlugs = ["nativity", "crosses", "rosaries", "home"] as const;
export type CategorySlug = (typeof categorySlugs)[number];

export type Product = {
  slug: string;
  category: CategorySlug;
  /** Base price in USD; other currencies are converted for display. */
  priceUsd: number;
  /** Approximate size in centimetres: width × height × depth. */
  sizeCm: readonly [number, number, number];
  featured?: boolean;
};

export const products = [
  { slug: "nativity-set-classic", category: "nativity", priceUsd: 89, sizeCm: [30, 20, 15], featured: true },
  { slug: "nativity-stable-grand", category: "nativity", priceUsd: 189, sizeCm: [45, 32, 22] },
  { slug: "holy-family-figurine", category: "nativity", priceUsd: 54, sizeCm: [10, 18, 6] },
  { slug: "jerusalem-cross", category: "crosses", priceUsd: 39, sizeCm: [15, 15, 2], featured: true },
  { slug: "wall-cross-carved", category: "crosses", priceUsd: 45, sizeCm: [14, 25, 2] },
  { slug: "pocket-holding-cross", category: "crosses", priceUsd: 14, sizeCm: [4, 6, 1] },
  { slug: "rosary-olive-wood", category: "rosaries", priceUsd: 24, sizeCm: [3, 50, 1], featured: true },
  { slug: "chaplet-bracelet", category: "rosaries", priceUsd: 16, sizeCm: [6, 6, 1] },
  { slug: "prayer-beads-33", category: "rosaries", priceUsd: 19, sizeCm: [3, 34, 1] },
  { slug: "salad-bowl", category: "home", priceUsd: 69, sizeCm: [28, 10, 28], featured: true },
  { slug: "serving-board", category: "home", priceUsd: 49, sizeCm: [40, 2, 20] },
  { slug: "candle-holder-pair", category: "home", priceUsd: 34, sizeCm: [8, 10, 8] },
] as const satisfies readonly Product[];

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

export function productImage(slug: string): string {
  return `/images/products/${slug}.webp`;
}

export function categoryImage(slug: CategorySlug): string {
  return `/images/categories/${slug}.webp`;
}

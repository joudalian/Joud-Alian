import { categories, fromPriceUsd, productText, type Product } from "./catalog";
import type { Locale } from "@/i18n/locales";

/** Shop search and filters, read from the URL (?q=&category=&min=&max=&size=&availability=). */
export type ShopQuery = {
  q: string;
  category: string;
  min: number | null;
  max: number | null;
  size: "" | "small" | "medium" | "large";
  availability: "" | "in_stock" | "available";
};
export const SIZES = ["small", "medium", "large"] as const;
export const AVAILABILITY = ["in_stock", "available"] as const;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
const amount = (v: string) => {
  const n = Number(v);
  return v !== "" && Number.isFinite(n) && n >= 0 ? Math.min(n, 1_000_000) : null;
};

export function parseShopQuery(params: Params): ShopQuery {
  const category = one(params.category);
  const size = one(params.size);
  const availability = one(params.availability);
  return {
    q: one(params.q).slice(0, 80),
    category: categories.some((c) => c.slug === category) ? category : "",
    min: amount(one(params.min)),
    max: amount(one(params.max)),
    size: (SIZES as readonly string[]).includes(size) ? (size as ShopQuery["size"]) : "",
    availability: (AVAILABILITY as readonly string[]).includes(availability) ? (availability as ShopQuery["availability"]) : "",
  };
}

export function isFiltered(q: ShopQuery): boolean {
  return Boolean(q.q || q.category || q.min !== null || q.max !== null || q.size || q.availability);
}

/** Lower case, accents removed: "Crèche" matches "creche". */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** small: up to 12 cm, medium: up to 25 cm, large: above, by the longest side (any variant). Unknown: null. */
export function sizeClass(product: Product): ShopQuery["size"] | null {
  const sides = [product.sizeCm, ...product.variants.map((v) => v.sizeCm)].filter(Boolean).flatMap((s) => s!);
  if (sides.length === 0) return null;
  const longest = Math.max(...sides);
  return longest <= 12 ? "small" : longest <= 25 ? "medium" : "large";
}

export function filterProducts(list: readonly Product[], q: ShopQuery, locale: Locale): Product[] {
  const words = fold(q.q).split(/\s+/).filter(Boolean);
  return list.filter((p) => {
    if (q.category && !p.categories.includes(q.category)) return false;
    const price = fromPriceUsd(p);
    if (q.min !== null && price < q.min) return false;
    if (q.max !== null && price > q.max) return false;
    if (q.size && sizeClass(p) !== q.size) return false;
    if (q.availability === "in_stock" && p.availability !== "in_stock") return false;
    if (q.availability === "available" && p.availability === "sold_out") return false;
    if (words.length) {
      const own = productText(p, locale);
      const haystack = fold([own.name, own.summary ?? "", own.description, p.text.en.name, p.sku, ...p.tags, ...p.variants.map((v) => v.sku)].join(" "));
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    return true;
  });
}

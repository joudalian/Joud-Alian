import type { Availability, ProductImage } from "@/data/catalog-schema";
import type { Locale } from "@/i18n/locales";

// This module runs in the browser (order page, product page, header count), so it never imports the catalog: the
// server passes the compact, already validated OrderProduct entries it needs (src/lib/order-lookup.ts). Prices
// computed here are only for display; checkout prices everything again on the server (src/server/pricing.ts).

export type OrderLine = { slug: string; qty: number; variantId?: string; engraving?: string };

export type OrderVariant = {
  id: string;
  sku: string;
  /** The variant's own price, or the product price. */
  priceUsd: number;
  /** Label in the page language (English when missing) and in English (for the owner). */
  label: string;
  labelEn: string;
};

/** What the order page, the wishlist and the order message need to know about a product, in one language. */
export type OrderProduct = {
  slug: string;
  sku: string;
  priceUsd: number;
  compareAtUsd?: number;
  availability: Availability;
  /** Name in the page language (English when missing; `lang` says which) and in English. */
  name: string;
  nameEn: string;
  lang: Locale;
  variants: OrderVariant[];
  /** Present only when engraving is offered. */
  engraving?: { maxChars: number; extraUsd: number };
  image: Pick<ProductImage, "file" | "width" | "height">;
};

export type OrderLookup = Readonly<Record<string, OrderProduct>>;

/** Per product: the variant ids and the longest engraving (0 = none). Enough to tell which cart lines count. */
export type CartRules = Readonly<Record<string, readonly [variantIds: readonly string[], engravingMax: number]>>;

/** Whether a line fits the product's rules: a listed variant when it has variants, engraving only when offered. */
export function lineFits(line: OrderLine, rule: CartRules[string] | undefined): boolean {
  if (!rule) return false;
  const [variantIds, engravingMax] = rule;
  if (line.variantId ? !variantIds.includes(line.variantId) : variantIds.length > 0) return false;
  return !line.engraving || Array.from(line.engraving).length <= engravingMax;
}

export function cartRule(product: OrderProduct): CartRules[string] {
  return [product.variants.map((v) => v.id), product.engraving?.maxChars ?? 0];
}

export function orderVariant(product: OrderProduct, variantId: string | undefined): OrderVariant | undefined {
  return variantId ? product.variants.find((v) => v.id === variantId) : undefined;
}

/**
 * Whether a cart line can still be ordered: the product (and its variant) must exist, and engraving text needs a
 * product that still offers engraving. Other lines are shown as "no longer available" and left out of the order.
 */
export function lineProduct(line: OrderLine, lookup: OrderLookup): OrderProduct | undefined {
  const product = Object.hasOwn(lookup, line.slug) ? lookup[line.slug] : undefined;
  return product && lineFits(line, cartRule(product)) ? product : undefined;
}

/** Price of one piece in USD: the variant's price if it has one, plus engraving when requested. */
export function unitPrice(product: OrderProduct, variantId?: string, engraved = false): number {
  return (orderVariant(product, variantId)?.priceUsd ?? product.priceUsd) + (engraved && product.engraving ? product.engraving.extraUsd : 0);
}

/** Price of a whole line in USD (variant price and engraving included). */
export function linePriceUsd(product: OrderProduct, line: OrderLine): number {
  return unitPrice(product, line.variantId, Boolean(line.engraving)) * line.qty;
}

/** Lowest price among the piece and its variants, and whether variants cost different amounts. */
export function fromPrice(product: OrderProduct): { usd: number; range: boolean } {
  const range = product.variants.some((v) => v.priceUsd !== product.priceUsd);
  return { usd: Math.min(product.priceUsd, ...product.variants.map((v) => v.priceUsd)), range };
}

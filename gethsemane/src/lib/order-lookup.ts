import type { PurchaseProduct } from "@/components/ProductPurchase";
import type { Locale } from "@/i18n/locales";
import { mainImage, products, productText, unitPriceUsd, variantLabel, type Product } from "./catalog";
import { cartRule, type CartRules, type OrderLookup, type OrderProduct } from "./cart-lookup";

// Server only: turns validated catalog entries into the compact data client components receive as props, so the
// browser never loads the catalog (all languages), its schema or zod.

export function orderProduct(product: Product, locale: Locale): OrderProduct {
  const text = productText(product, locale);
  const image = mainImage(product);
  return {
    slug: product.slug,
    sku: product.sku,
    priceUsd: product.priceUsd,
    ...(product.compareAtUsd !== undefined ? { compareAtUsd: product.compareAtUsd } : {}),
    availability: product.availability,
    name: text.name,
    nameEn: product.text.en.name,
    lang: text.lang,
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      priceUsd: unitPriceUsd(product, v.id),
      label: variantLabel(v, locale),
      labelEn: v.label.en,
    })),
    ...(product.engraving?.enabled ? { engraving: { maxChars: product.engraving.maxChars, extraUsd: product.engraving.extraUsd } } : {}),
    image: { file: image.file, width: image.width, height: image.height },
  };
}

/** Every product in one language (the order and wishlist pages: any piece can be in them). */
export function orderLookup(locale: Locale): OrderLookup {
  return Object.fromEntries(products.map((p) => [p.slug, orderProduct(p, locale)]));
}

/** The rules for counting cart lines (header badges on every page): no names, prices or photos. */
export function cartRules(): CartRules {
  return Object.fromEntries(products.map((p) => [p.slug, cartRule(orderProduct(p, "en"))]));
}

/** The product page's purchase block: the order data plus sizes, weight and lead time. */
export function purchaseProduct(product: Product, locale: Locale): PurchaseProduct {
  return {
    ...orderProduct(product, locale),
    ...(product.leadTimeDays ? { leadTimeDays: product.leadTimeDays } : {}),
    ...(product.sizeCm ? { sizeCm: product.sizeCm } : {}),
    ...(product.weightG ? { weightG: product.weightG } : {}),
    variantSpecs: Object.fromEntries(
      product.variants.map((v) => [v.id, { ...(v.sizeCm ? { sizeCm: v.sizeCm } : {}), ...(v.weightG ? { weightG: v.weightG } : {}) }]),
    ),
  };
}

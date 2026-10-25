import { STORE_NAME } from "@/config/store";
import { localeNames, type Locale } from "@/i18n/locales";
import type { Availability, ProductImage } from "@/data/catalog-schema";
import { formatPrice, type Currency } from "./currency";
import { encodeMessage, MAX_ENCODED_MESSAGE } from "./whatsapp";

// This module runs in the browser (order page, product page buttons, header count), so it never imports the
// catalog: the server passes the compact, already validated OrderProduct entries it needs (src/lib/order-lookup.ts).

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
/** `giftNote` is the gift-note text when the gift-note box is ticked (possibly ""), undefined when it is not. */
export type OrderDetails = { name?: string; country?: string; notes?: string; giftNote?: string };
type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The WhatsApp order message, in the page language: items with quantities and prices in the selected
 * currency, the USD total (the reference price), the selected currency, optional details and the store name.
 * For the owner, each line also carries the English product name and the SKU, and the site language is noted.
 * `t` is the "whatsapp" namespace translator.
 */
export function buildOrderMessage(
  t: Translate,
  lines: readonly OrderLine[],
  lookup: OrderLookup,
  currency: Currency,
  locale: Locale,
  details: OrderDetails = {},
): string {
  let totalUsd = 0;
  const items: string[] = [];
  for (const line of lines) {
    const product = lineProduct(line, lookup);
    if (!product) continue;
    const price = linePriceUsd(product, line);
    totalUsd += price;
    const variant = orderVariant(product, line.variantId);
    const name = variant ? `${product.name}, ${variant.label}` : product.name;
    const english = variant ? `${product.nameEn}, ${variant.labelEn}` : product.nameEn;
    const sku = variant?.sku ?? product.sku;
    const ref = locale === "en" || name === english ? sku : `${english}, ${sku}`;
    items.push(`• ${t("line", { qty: line.qty, name, price: formatPrice(price, currency, locale) })} (${ref})`);
    if (line.engraving) items.push(`  ${t("engraving", { text: line.engraving })}`);
  }
  if (items.length === 0) return "";
  const out = [t("greeting", { store: STORE_NAME }), "", ...items, ""];
  if (currency !== "USD") out.push(t("total", { currency, total: formatPrice(totalUsd, currency, locale) }));
  out.push(t("totalUsd", { total: formatPrice(totalUsd, "USD", locale) }));
  out.push(t("currency", { currency }));
  out.push(`Site language: ${localeNames[locale]} (${locale})`);
  const name = details.name?.trim();
  const country = details.country?.trim();
  const notes = details.notes?.trim();
  const gift = details.giftNote === undefined ? undefined : details.giftNote.trim();
  if (name || country || notes || gift !== undefined) out.push("");
  if (name) out.push(t("name", { name }));
  if (country) out.push(t("country", { country }));
  if (notes) out.push(t("notes", { notes }));
  if (gift !== undefined) out.push(gift ? t("giftNote", { note: gift }) : t("giftNoteEmpty"));
  out.push("", t("closing"), `— ${STORE_NAME}`);
  return out.join("\n");
}

/** Shortens `text` to `chars` characters (whole code points) and marks the cut. */
function cut(text: string, chars: number, mark: string) {
  const points = Array.from(text);
  return points.length <= chars ? text : `${points.slice(0, Math.max(0, chars)).join("").trimEnd()}… ${mark}`;
}

/**
 * The message for the wa.me link: if it would exceed MAX_ENCODED_MESSAGE once encoded, the notes and then the
 * gift-note text are shortened (the full text stays in the copy-and-paste preview). Items are never cut.
 */
export function fitOrderMessage(
  t: Translate,
  lines: readonly OrderLine[],
  lookup: OrderLookup,
  currency: Currency,
  locale: Locale,
  details: OrderDetails = {},
) {
  const full = buildOrderMessage(t, lines, lookup, currency, locale, details);
  if (encodeMessage(full).length <= MAX_ENCODED_MESSAGE) return { message: full, shortened: false };
  const mark = t("shortened");
  let d = { ...details };
  for (const field of ["notes", "giftNote"] as const) {
    const original = details[field];
    if (!original) continue;
    let keep = Array.from(original).length;
    do {
      keep = keep < 40 ? 0 : Math.floor(keep * 0.8);
      d = { ...d, [field]: keep === 0 ? `… ${mark}` : cut(original, keep, mark) };
      const message = buildOrderMessage(t, lines, lookup, currency, locale, d);
      if (encodeMessage(message).length <= MAX_ENCODED_MESSAGE) return { message, shortened: true };
    } while (keep > 0);
  }
  return { message: buildOrderMessage(t, lines, lookup, currency, locale, d), shortened: true };
}

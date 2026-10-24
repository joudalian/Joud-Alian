import { STORE_NAME } from "@/config/store";
import { localeNames, type Locale } from "@/i18n/locales";
import { getProduct, getVariant, productSku, productText, unitPriceUsd, variantLabel, type Product } from "./catalog";
import { formatPrice, type Currency } from "./currency";
import { encodeMessage, MAX_ENCODED_MESSAGE } from "./whatsapp";

export type OrderLine = { slug: string; qty: number; variantId?: string; engraving?: string };

/**
 * Whether a cart line can still be ordered: the product (and its variant) must exist, and engraving text needs a
 * product that still offers engraving. Other lines are shown as "no longer available" and left out of the order.
 */
export function lineProduct(line: OrderLine): Product | undefined {
  const product = getProduct(line.slug);
  if (!product) return undefined;
  if (line.variantId && !getVariant(product, line.variantId)) return undefined;
  if (!line.variantId && product.variants.length > 0) return undefined;
  if (line.engraving && !product.engraving?.enabled) return undefined;
  if (line.engraving && Array.from(line.engraving).length > product.engraving!.maxChars) return undefined;
  return product;
}

/** Price of a whole line in USD (variant price and engraving included). */
export function linePriceUsd(product: Product, line: OrderLine): number {
  return unitPriceUsd(product, line.variantId, Boolean(line.engraving)) * line.qty;
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
export function buildOrderMessage(t: Translate, lines: readonly OrderLine[], currency: Currency, locale: Locale, details: OrderDetails = {}): string {
  let totalUsd = 0;
  const items: string[] = [];
  for (const line of lines) {
    const product = lineProduct(line);
    if (!product) continue;
    const price = linePriceUsd(product, line);
    totalUsd += price;
    const variant = getVariant(product, line.variantId);
    const localName = productText(product, locale).name;
    const name = variant ? `${localName}, ${variantLabel(variant, locale)}` : localName;
    const english = variant ? `${product.text.en.name}, ${variant.label.en}` : product.text.en.name;
    const sku = productSku(product, line.variantId);
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
export function fitOrderMessage(t: Translate, lines: readonly OrderLine[], currency: Currency, locale: Locale, details: OrderDetails = {}) {
  const full = buildOrderMessage(t, lines, currency, locale, details);
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
      const message = buildOrderMessage(t, lines, currency, locale, d);
      if (encodeMessage(message).length <= MAX_ENCODED_MESSAGE) return { message, shortened: true };
    } while (keep > 0);
  }
  return { message: buildOrderMessage(t, lines, currency, locale, d), shortened: true };
}

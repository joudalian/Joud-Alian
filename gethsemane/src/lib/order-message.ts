import { STORE_NAME } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { getProduct, productText } from "./catalog";
import { formatPrice, type Currency } from "./currency";

export type OrderLine = { slug: string; qty: number };
export type OrderDetails = { name?: string; country?: string; notes?: string; giftNote?: string };
type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * The WhatsApp order message, in the page language: items with quantities and prices in the selected
 * currency, the USD total (the reference price), the selected currency, optional details and the store name.
 * `t` is the "whatsapp" namespace translator.
 */
export function buildOrderMessage(t: Translate, lines: readonly OrderLine[], currency: Currency, locale: Locale, details: OrderDetails = {}): string {
  let totalUsd = 0;
  const items: string[] = [];
  for (const line of lines) {
    const product = getProduct(line.slug);
    if (!product) continue;
    totalUsd += product.priceUsd * line.qty;
    items.push(`• ${t("line", { qty: line.qty, name: productText(product, locale).name, price: formatPrice(product.priceUsd * line.qty, currency, locale) })}`);
  }
  if (items.length === 0) return "";
  const out = [t("greeting", { store: STORE_NAME }), "", ...items, ""];
  if (currency !== "USD") out.push(t("total", { currency, total: formatPrice(totalUsd, currency, locale) }));
  out.push(t("totalUsd", { total: formatPrice(totalUsd, "USD", locale) }));
  out.push(t("currency", { currency }));
  const name = details.name?.trim();
  const country = details.country?.trim();
  const notes = details.notes?.trim();
  const gift = details.giftNote?.trim();
  if (name || country || notes || gift) out.push("");
  if (name) out.push(t("name", { name }));
  if (country) out.push(t("country", { country }));
  if (notes) out.push(t("notes", { notes }));
  if (gift) out.push(t("giftNote", { note: gift }));
  out.push("", t("closing"), `— ${STORE_NAME}`);
  return out.join("\n");
}

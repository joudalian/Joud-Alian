"use client";

import { useLocale, useTranslations } from "next-intl";
import { STORE_NAME } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { getProduct, productText } from "@/lib/catalog";
import { formatPrice } from "@/lib/currency";
import { whatsappUrl } from "@/lib/whatsapp";
import { useCurrency } from "./CurrencyProvider";
import { ChatIcon } from "./Icons";

type OrderLine = { slug: string; qty: number };

/** "Order via WhatsApp": opens wa.me with the items, quantities, currency and total, in the page language. */
export function WhatsAppOrderButton({ lines, className = "btn btn-primary btn-block" }: { lines: readonly OrderLine[]; className?: string }) {
  const t = useTranslations("whatsapp");
  const locale = useLocale() as Locale;
  const { currency } = useCurrency();

  let totalUsd = 0;
  const itemLines: string[] = [];
  for (const line of lines) {
    const product = getProduct(line.slug);
    if (!product) continue;
    totalUsd += product.priceUsd * line.qty;
    itemLines.push(
      `• ${t("line", { qty: line.qty, name: productText(product, locale).name, price: formatPrice(product.priceUsd * line.qty, currency, locale) })}`,
    );
  }
  if (itemLines.length === 0) return null;

  const message = [
    t("greeting", { store: STORE_NAME }),
    "",
    ...itemLines,
    "",
    t("total", { total: formatPrice(totalUsd, currency, locale) }),
    t("currency", { currency }),
    "",
    t("closing"),
    `— ${STORE_NAME}`,
  ].join("\n");

  return (
    <a className={className} href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" data-testid="whatsapp-order">
      <ChatIcon size={18} />
      {t("button")}
      <span className="sr-only"> ({t("newTab")})</span>
    </a>
  );
}

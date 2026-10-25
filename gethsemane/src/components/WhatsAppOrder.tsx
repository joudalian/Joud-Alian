"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/locales";
import { buildOrderMessage, type OrderLine, type OrderLookup } from "@/lib/order-message";
import { whatsappUrl } from "@/lib/whatsapp";
import { useCurrency } from "./CurrencyProvider";
import { ChatIcon } from "./Icons";

/** Opens wa.me with the order message (items, quantities, currency, totals) in the page language. */
export function WhatsAppOrderButton({
  lines,
  lookup,
  label,
  className = "btn btn-primary btn-block",
}: {
  lines: readonly OrderLine[];
  /** The products the lines refer to. */
  lookup: OrderLookup;
  label: string;
  className?: string;
}) {
  const t = useTranslations("whatsapp");
  const locale = useLocale() as Locale;
  const { currency } = useCurrency();
  const message = buildOrderMessage(t, lines, lookup, currency, locale);
  if (!message) return null;
  return (
    <a className={className} href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" data-testid="whatsapp-order">
      <ChatIcon size={18} />
      {label}
      <span className="sr-only"> ({t("newTab")})</span>
    </a>
  );
}

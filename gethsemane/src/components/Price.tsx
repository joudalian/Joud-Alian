"use client";

import { useLocale } from "next-intl";
import { formatPrice } from "@/lib/currency";
import type { Locale } from "@/i18n/locales";
import { useCurrency } from "./CurrencyProvider";

export function Price({ usd, className = "price" }: { usd: number; className?: string }) {
  const { currency } = useCurrency();
  const locale = useLocale() as Locale;
  return (
    <span className={className} data-currency={currency}>
      {formatPrice(usd, currency, locale)}
    </span>
  );
}

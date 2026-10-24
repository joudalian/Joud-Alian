"use client";

import { useLocale, useTranslations } from "next-intl";
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

/**
 * A price with its optional previous price (struck through, only when the data sets compareAtUsd) and an
 * optional "from" for pieces whose variants cost more. Screen readers hear "Was … Now …".
 */
export function PriceTag({ usd, compareAtUsd, from = false }: { usd: number; compareAtUsd?: number; from?: boolean }) {
  const t = useTranslations("product");
  const { currency } = useCurrency();
  const locale = useLocale() as Locale;
  const now = formatPrice(usd, currency, locale);
  return (
    <span className="price-tag" data-currency={currency}>
      {compareAtUsd !== undefined && compareAtUsd > usd && (
        <s className="price-was">
          <span className="sr-only">{t("priceWas")} </span>
          {formatPrice(compareAtUsd, currency, locale)}
        </s>
      )}
      <span className={compareAtUsd !== undefined && compareAtUsd > usd ? "price price-sale" : "price"}>
        {compareAtUsd !== undefined && compareAtUsd > usd && <span className="sr-only">{t("priceNow")} </span>}
        {from ? t("priceFrom", { price: now }) : now}
      </span>
    </span>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { currencies, isCurrency } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";
import { ChevronDownIcon } from "./Icons";

export function CurrencySelect() {
  const t = useTranslations("currency");
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="currency-select">
      <label htmlFor="currency-select" className="sr-only">
        {t("label")}
      </label>
      <select
        id="currency-select"
        value={currency}
        onChange={(e) => {
          if (isCurrency(e.target.value)) setCurrency(e.target.value);
        }}
      >
        {currencies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={16} />
    </div>
  );
}

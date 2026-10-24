import type { Locale } from "@/i18n/locales";

export const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type Currency = (typeof currencies)[number];
export const defaultCurrency: Currency = "USD";
export const CURRENCY_COOKIE = "currency";

/** Indicative conversion rates from USD, used for display only. Update before launch. */
const ratesFromUsd: Record<Currency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.52,
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (currencies as readonly string[]).includes(value);
}

export function convertFromUsd(amountUsd: number, currency: Currency): number {
  return Math.round(amountUsd * ratesFromUsd[currency] * 100) / 100;
}

export function formatPrice(amountUsd: number, currency: Currency, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(convertFromUsd(amountUsd, currency));
}

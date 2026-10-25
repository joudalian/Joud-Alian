import { OPENING_HOURS } from "@/config/store";
import { isLocale, type Locale } from "@/i18n/locales";

/** Intl locale for formatting: British English for "en" (the copy uses British spelling); English for anything unknown. */
const intlLocale = (locale: Locale) => (locale === "en" || !isLocale(locale) ? "en-GB" : locale);

/** "2026-10-24" → a long date in the page language (formatted in UTC so it never shifts a day). */
export function formatDate(isoDate: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** ISO weekday (1 = Monday … 7 = Sunday) → localized weekday name. */
function weekdayName(day: number, locale: Locale): string {
  // 2024-01-01 was a Monday.
  return new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));
}

/** "Monday–Friday" for consecutive days, otherwise a localized list. */
export function formatOpeningDays(locale: Locale): string {
  const days = [...OPENING_HOURS.days];
  if (days.length === 0) return "";
  const consecutive = days.every((d, i) => i === 0 || d === days[i - 1]! + 1);
  if (consecutive && days.length > 2) return `${weekdayName(days[0]!, locale)}–${weekdayName(days[days.length - 1]!, locale)}`;
  return new Intl.ListFormat(intlLocale(locale), { type: "conjunction" }).format(days.map((d) => weekdayName(d, locale)));
}

export const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;
export const gToOz = (g: number) => Math.round((g / 28.3495) * 10) / 10;

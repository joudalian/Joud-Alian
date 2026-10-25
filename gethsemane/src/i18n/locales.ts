// Plain module (no next-intl import) so it can be used by the proxy, scripts and tests.
export const locales = ["en", "fr", "es", "it", "de", "el", "pl", "ro", "uk", "pt"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  de: "Deutsch",
  el: "Ελληνικά",
  pl: "Polski",
  ro: "Română",
  uk: "Українська",
  pt: "Português (PT)",
};

/** BCP 47 tags used for hreflang and Open Graph. */
export const ogLocales: Record<Locale, string> = {
  en: "en_GB", // the English copy uses British spelling
  fr: "fr_FR",
  es: "es_ES",
  it: "it_IT",
  de: "de_DE",
  el: "el_GR",
  pl: "pl_PL",
  ro: "ro_RO",
  uk: "uk_UA",
  pt: "pt_PT",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export const LOCALE_COOKIE = "NEXT_LOCALE";

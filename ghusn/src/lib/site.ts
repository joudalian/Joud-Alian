import { STORE_NAME } from "@/config/store";
import { defaultLocale, locales, type Locale } from "@/i18n/locales";

function resolveSiteUrl(): string {
  const raw = process.env.SITE_URL;
  if (raw) {
    try {
      const url = new URL(raw);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      // fall through to the default
    }
  }
  return "http://localhost:3000";
}

/** Read at request time (pages are rendered per request), so it can be set by the host without a rebuild. */
export const siteUrl = resolveSiteUrl();
export const siteName = STORE_NAME;

/** Path without locale, e.g. "" for home or "/shop". */
export function localizedUrl(locale: Locale, path: string): string {
  return `${siteUrl}/${locale}${path}`;
}

export function alternates(locale: Locale, path: string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = localizedUrl(l, path);
  languages["x-default"] = localizedUrl(defaultLocale, path);
  return { canonical: localizedUrl(locale, path), languages };
}

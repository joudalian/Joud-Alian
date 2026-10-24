import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./locales";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  // Locale detection and redirects are handled by src/proxy.ts.
  localeCookie: false,
  alternateLinks: false,
});

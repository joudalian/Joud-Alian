import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { locales, ogLocales, type Locale } from "@/i18n/locales";
import { alternates, localizedUrl, siteName } from "./site";

/** Title, description, canonical URL, hreflang alternates and Open Graph for a localized page. */
export async function pageMetadata({
  locale,
  path,
  title,
  description,
  noindex = false,
}: {
  locale: Locale;
  path: string;
  title?: string;
  description?: string;
  noindex?: boolean;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "meta" });
  const desc = description ?? t("description");
  const fullTitle = title ? `${title} · ${siteName}` : t("title");
  return {
    title: { absolute: fullTitle },
    description: desc,
    alternates: noindex ? undefined : alternates(locale, path),
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      siteName,
      title: fullTitle,
      description: desc,
      url: localizedUrl(locale, path),
      locale: ogLocales[locale],
      alternateLocale: locales.filter((l) => l !== locale).map((l) => ogLocales[l]),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: desc },
  };
}

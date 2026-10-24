import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/Navigation";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isLocale } from "@/i18n/locales";
import { CURRENCY_COOKIE } from "@/lib/currency";
import { garamond, inter } from "@/lib/fonts";
import { siteName, siteUrl } from "@/lib/site";
import { parseCurrency } from "@/lib/storage";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#252e16",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    title: { default: t("title"), template: `%s · ${siteName}` },
    description: t("description"),
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const [messages, t, cookieStore] = await Promise.all([getMessages(), getTranslations("nav"), cookies()]);
  const currencyCookie = cookieStore.get(CURRENCY_COOKIE)?.value;

  return (
    <html lang={locale} className={`${garamond.variable} ${inter.variable}`}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <CurrencyProvider initialCurrency={parseCurrency(currencyCookie)} hasCookie={currencyCookie !== undefined}>
            <a href="#main" className="skip-link">
              {t("skip")}
            </a>
            <Header />
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <Footer />
            <BottomNav />
            <LanguageSwitcher />
          </CurrencyProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

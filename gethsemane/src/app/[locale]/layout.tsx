import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { JsonLd } from "@/components/JsonLd";
import { LiveRegion } from "@/components/LiveRegion";
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
import { organization } from "@/lib/structured-data";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2a3519" /* --olive-900 */,
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

/** Only the namespaces used by client components are sent to the browser (policy texts stay on the server). */
const CLIENT_NAMESPACES = ["nav", "language", "currency", "product", "cart", "wishlist", "whatsapp", "contact", "error"] as const;
function clientMessages(messages: Record<string, unknown>) {
  return Object.fromEntries(CLIENT_NAMESPACES.filter((ns) => ns in messages).map((ns) => [ns, messages[ns]])) as typeof messages;
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
        <NextIntlClientProvider locale={locale} messages={clientMessages(messages)}>
          <CurrencyProvider initialCurrency={parseCurrency(currencyCookie)} hasCookie={currencyCookie !== undefined}>
            <a href="#main" className="skip-link">
              {t("skip")}
            </a>
            <AnnouncementBar />
            <Header />
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <Footer />
            <BottomNav />
            <LanguageSwitcher />
            <LiveRegion />
            <JsonLd data={organization(locale)} />
          </CurrencyProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

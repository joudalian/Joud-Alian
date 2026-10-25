import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { CONTACT_EMAIL } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { countryOptions } from "@/lib/countries";
import { pageMetadata } from "@/lib/metadata";
import { currentUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { addresses } from "@/server/db/schema";
import { feature } from "@/server/features";
import { checkoutBlock, livePayments, paymentMode } from "@/server/payments";
import { shippableCountries } from "@/server/pricing";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ cancelled?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return pageMetadata({ locale, path: "/checkout", title: t("title"), noindex: true });
}

/** Messages the checkout form needs in the browser (only on this page). */
const NAMESPACES = ["checkout", "address", "currency"] as const;

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { cancelled } = await searchParams;
  const t = await getTranslations("checkout");
  const blocked = checkoutBlock();
  if (blocked) {
    return (
      <div className="container page checkout-page">
        <h1>{t("title")}</h1>
        <div className="notice-card" role="status" data-testid="payments-soon">
          <h2>{t("soonTitle")}</h2>
          <p>{t("soonText")}</p>
          <p>
            {CONTACT_EMAIL && (
              <>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                {" · "}
              </>
            )}
            <Link href="/contact">{t("contactPage")}</Link>
          </p>
        </div>
      </div>
    );
  }
  const user = await currentUser();
  const saved = user
    ? await (await getDb())
        .select()
        .from(addresses)
        .where(eq(addresses.userId, user.id))
        .orderBy(desc(addresses.isDefault), asc(addresses.createdAt))
    : [];
  const allowed = new Set(shippableCountries());
  const messages = await getMessages();
  const own = Object.fromEntries(NAMESPACES.map((ns) => [ns, messages[ns]]));
  return (
    <div className="container page checkout-page">
      <h1>{t("title")}</h1>
      {cancelled && (
        <p className="form-message form-error" role="status" data-testid="checkout-cancelled">
          {t("cancelled")}
        </p>
      )}
      <NextIntlClientProvider locale={locale} messages={own}>
        <CheckoutForm
          countries={countryOptions(locale, [...allowed])}
          saved={saved
            .filter((a) => allowed.has(a.country))
            .map((a) => ({ id: a.id, name: a.name, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, country: a.country, phone: a.phone, isDefault: a.isDefault }))}
          user={user ? { email: user.email, name: user.name } : null}
          testMode={paymentMode() === "test"}
          stripeNote={livePayments()}
          confirmEngraving={feature("engravingPreview")}
        />
      </NextIntlClientProvider>
    </div>
  );
}

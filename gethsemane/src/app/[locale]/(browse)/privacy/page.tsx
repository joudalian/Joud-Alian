import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EmailText } from "@/components/EmailText";
import { InfoPage, Section } from "@/components/InfoPage";
import { ADDRESS, CONTACT_EMAIL, DATA_RETENTION_YEARS, LEGAL_ENTITY_NAME, POLICY_UPDATED, STORE_NAME } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { feature } from "@/server/features";
import { livePayments } from "@/server/payments";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return pageMetadata({ locale, path: "/privacy", title: t("title"), description: t("intro") });
}

// Every statement on this page reflects what the code does: see README "Privacy" for the audit.
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");
  const tTerms = await getTranslations("terms");
  return (
    <InfoPage locale={locale} path="/privacy" title={t("title")} intro={t("intro")} updated={POLICY_UPDATED}>
      <Section id="controller" title={t("controllerTitle")}>
        <p>{t("controller")}</p>
        <ul className="plain-list">
          <li>{LEGAL_ENTITY_NAME ? tTerms("entity", { name: LEGAL_ENTITY_NAME }) : STORE_NAME}</li>
          {ADDRESS && <li>{tTerms("address", { address: ADDRESS })}</li>}
          {CONTACT_EMAIL && (
            <li>
              <EmailText text={tTerms("email", { email: CONTACT_EMAIL })} />
            </li>
          )}
        </ul>
      </Section>
      <Section id="tracking" title={t("trackingTitle")}>
        <p>{t("tracking")}</p>
      </Section>
      <Section id="browser" title={t("browserTitle")}>
        <p>{t("browser")}</p>
        <p>{t("cookies")}</p>
      </Section>
      <Section id="orders" title={t("ordersTitle")}>
        <p>{t("orders")}</p>
      </Section>
      <Section id="accounts" title={t("accountsTitle")}>
        <p>{t("accounts")}</p>
        <p>{t.rich("accountsControl", { link: (chunks) => <Link href="/account/profile">{chunks}</Link> })}</p>
      </Section>
      <Section id="messages" title={t("messagesTitle")}>
        <p>{t("messages")}</p>
      </Section>
      {feature("newsletter") && (
        <Section id="newsletter" title={t("newsletterTitle")}>
          <p>{t("newsletter")}</p>
        </Section>
      )}
      {feature("reviews") && (
        <Section id="reviews" title={t("reviewsTitle")}>
          <p>{t("reviews")}</p>
        </Section>
      )}
      <Section id="processors" title={t("processorsTitle")}>
        <ul>
          {/* Stripe is named only once live payments are on (check:claims enforces it). */}
          <li>{livePayments() ? t("paymentsStripe") : t("payments")}</li>
          <li>{t("emailProvider")}</li>
          <li>{t("hosting")}</li>
          <li>{t("database")}</li>
          <li>{t("carriers")}</li>
        </ul>
      </Section>
      <Section id="use" title={t("useTitle")}>
        <p>{t("use")}</p>
      </Section>
      <Section id="bases" title={t("basesTitle")}>
        <ul>
          <li>{t("basisContract")}</li>
          <li>{t("basisLegal")}</li>
          <li>{t("basisInterest")}</li>
          <li>{t("basisConsent")}</li>
        </ul>
      </Section>
      <Section id="retention" title={t("retentionTitle")}>
        <p>{DATA_RETENTION_YEARS > 0 ? t("retentionYears", { years: DATA_RETENTION_YEARS }) : t("retentionDefault")}</p>
        <p>{t("retentionOther")}</p>
      </Section>
      <Section id="rights" title={t("rightsTitle")}>
        <p>{t.rich("rights", { link: (chunks) => <Link href="/contact">{chunks}</Link> })}</p>
      </Section>
      {(["transfer", "children", "security", "changes"] as const).map((key) => (
        <Section key={key} id={key} title={t(`${key}Title`)}>
          <p>{t(key)}</p>
        </Section>
      ))}
    </InfoPage>
  );
}

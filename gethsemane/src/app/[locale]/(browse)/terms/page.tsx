import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage, Section } from "@/components/InfoPage";
import { ADDRESS, CONTACT_EMAIL, GOVERNING_LAW, LEGAL_ENTITY_NAME, POLICY_UPDATED, TAX_ID, WHATSAPP_NUMBER } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { paymentText } from "@/lib/faq";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  return pageMetadata({ locale, path: "/terms", title: t("title"), description: t("intro") });
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");
  const tFaq = await getTranslations("faq");
  const tPolicy = await getTranslations("policy");
  return (
    <InfoPage locale={locale} path="/terms" title={t("title")} intro={t("intro")} updated={POLICY_UPDATED}>
      <Section id="order" title={t("orderTitle")}>
        <p>{t("order")}</p>
      </Section>
      <Section id="prices" title={t("pricesTitle")}>
        <p>{t("prices")}</p>
      </Section>
      <Section id="payment" title={t("paymentTitle")}>
        <p>{paymentText(tFaq)}</p>
      </Section>
      <Section id="delivery" title={t("deliveryTitle")}>
        <p>
          {t.rich("delivery", {
            shipping: (chunks) => <Link href="/shipping">{chunks}</Link>,
            returns: (chunks) => <Link href="/returns">{chunks}</Link>,
          })}
        </p>
      </Section>
      <Section id="variation" title={t("variationTitle")}>
        <p>{t("variation")}</p>
      </Section>
      <Section id="law" title={t("lawTitle")}>
        {/* TODO: governing law must be confirmed by a lawyer (GOVERNING_LAW in src/config/store.ts). */}
        <p>{t("law", { law: GOVERNING_LAW || `[${tPolicy("toBeConfirmed")}]` })}</p>
      </Section>
      <Section id="liability" title={t("liabilityTitle")}>
        <p>{t("liability")}</p>
      </Section>
      <Section id="legal-notice" title={t("noticeTitle")}>
        <ul className="plain-list">
          {LEGAL_ENTITY_NAME && <li>{t("entity", { name: LEGAL_ENTITY_NAME })}</li>}
          {ADDRESS && <li>{t("address", { address: ADDRESS })}</li>}
          {CONTACT_EMAIL && <li>{t("email", { email: CONTACT_EMAIL })}</li>}
          <li>{t("whatsapp", { phone: `+${WHATSAPP_NUMBER}` })}</li>
          <li>{t("sister")}</li>
          {/* TODO: add the tax / company registration ID (TAX_ID in src/config/store.ts) once registered. */}
          {TAX_ID && <li>{t("taxId", { id: TAX_ID })}</li>}
        </ul>
      </Section>
    </InfoPage>
  );
}

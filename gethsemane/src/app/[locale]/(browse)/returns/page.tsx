import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage, Section } from "@/components/InfoPage";
import { ADDRESS, CONTACT_EMAIL, LEGAL_ENTITY_NAME, POLICY_UPDATED, RETURN_DAYS, STORE_NAME, WHATSAPP_NUMBER } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "returns" });
  return pageMetadata({ locale, path: "/returns", title: t("title"), description: t("intro") });
}

export default async function ReturnsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("returns");
  const recipient = [LEGAL_ENTITY_NAME || STORE_NAME, ADDRESS, `WhatsApp +${WHATSAPP_NUMBER}`, CONTACT_EMAIL].filter(Boolean).join(", ");
  return (
    <InfoPage locale={locale} path="/returns" title={t("title")} intro={t("intro")} updated={POLICY_UPDATED}>
      <Section id="period" title={t("periodTitle", { days: RETURN_DAYS })}>
        <p>{t("period", { days: RETURN_DAYS })}</p>
      </Section>
      <Section id="excluded" title={t("excludedTitle")}>
        <ul>
          {[1, 2, 3, 4].map((n) => (
            <li key={n}>{t(`excluded${n}`)}</li>
          ))}
        </ul>
        <p>{t("variation")}</p>
      </Section>
      <Section id="cost" title={t("costTitle")}>
        <p>{t("cost")}</p>
      </Section>
      <Section id="refunds" title={t("refundTitle")}>
        <p>{t("refundEu")}</p>
        <p>{t("refundOther")}</p>
        <p>{t("refundShipping")}</p>
      </Section>
      <Section id="withdrawal" title={t("withdrawalTitle")}>
        <p>{t("withdrawal")}</p>
        <div className="withdrawal-form" role="group" aria-labelledby="form-title">
          <h3 id="form-title">{t("formTitle")}</h3>
          <p>{t("formIntro")}</p>
          <ul>
            <li>{t("formTo", { to: recipient })}</li>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <li key={n}>{t(`form${n}`)}</li>
            ))}
          </ul>
          <p className="note">{t("formNote")}</p>
        </div>
        <p>{t("formSend", { email: CONTACT_EMAIL || "none" })}</p>
      </Section>
      <Section id="guarantee" title={t("guaranteeTitle")}>
        <p>{t("guarantee")}</p>
      </Section>
    </InfoPage>
  );
}

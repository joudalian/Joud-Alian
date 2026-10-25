import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage, Section } from "@/components/InfoPage";
import { EmailText } from "@/components/EmailText";
import { WithdrawalForm } from "@/components/WithdrawalForm";
import { CONTACT_EMAIL, POLICY_UPDATED, RETURN_DAYS } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "returns" });
  return pageMetadata({ locale, path: "/returns", title: t("title"), description: t("metaDescription", { days: RETURN_DAYS }) });
}

export default async function ReturnsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("returns");
  const email = CONTACT_EMAIL ? "set" : "none";
  return (
    <InfoPage locale={locale} path="/returns" title={t("title")} intro={t("intro")} updated={POLICY_UPDATED}>
      <Section id="period" title={t("periodTitle", { days: RETURN_DAYS })}>
        <p>{t("period", { days: RETURN_DAYS })}</p>
        <p>{t("periodRights")}</p>
      </Section>
      <Section id="excluded" title={t("excludedTitle")}>
        <p>{t("excludedIntro")}</p>
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
        <p>{t("refundMethod")}</p>
        <p>{t("refundShipping")}</p>
      </Section>
      <Section id="withdrawal" title={t("withdrawalTitle")}>
        <p>{t.rich("withdrawal", { email, link: (chunks) => <Link href="/withdrawal">{chunks}</Link> })}</p>
        <WithdrawalForm />
        <p>
          <EmailText text={t("formSend", { email: CONTACT_EMAIL || "none" })} />
        </p>
      </Section>
      <Section id="guarantee" title={t("guaranteeTitle")}>
        <p>{t("guarantee")}</p>
      </Section>
    </InfoPage>
  );
}

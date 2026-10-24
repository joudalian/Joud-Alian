import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage, Section } from "@/components/InfoPage";
import { DATA_RETENTION_YEARS, POLICY_UPDATED } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";

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
  const sections = ["noAccounts", "browser", "whatsapp", "hosting", "use"] as const;
  return (
    <InfoPage locale={locale} path="/privacy" title={t("title")} intro={t("intro")} updated={POLICY_UPDATED}>
      {sections.map((key) => (
        <Section key={key} id={key} title={t(`${key}Title`)}>
          <p>{t(key)}</p>
        </Section>
      ))}
      <Section id="retention" title={t("retentionTitle")}>
        <p>{DATA_RETENTION_YEARS > 0 ? t("retentionYears", { years: DATA_RETENTION_YEARS }) : t("retentionDefault")}</p>
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

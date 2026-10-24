import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage, Section } from "@/components/InfoPage";
import { ACCESSIBILITY_REVIEWED } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "accessibilityPage" });
  return pageMetadata({ locale, path: "/accessibility", title: t("title"), description: t("intro") });
}

export default async function AccessibilityPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("accessibilityPage");
  return (
    <InfoPage locale={locale} path="/accessibility" title={t("title")} intro={t("intro")}>
      <Section id="target" title={t("targetTitle")}>
        <p>{t("target")}</p>
      </Section>
      <Section id="done" title={t("doneTitle")}>
        <p>{t("done")}</p>
      </Section>
      <Section id="gaps" title={t("gapsTitle")}>
        <ul>
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`gap${n}`)}</li>
          ))}
        </ul>
      </Section>
      <Section id="feedback" title={t("feedbackTitle")}>
        <p>{t.rich("feedback", { link: (chunks) => <Link href="/contact">{chunks}</Link> })}</p>
        <p className="note">{t("reviewed", { date: formatDate(ACCESSIBILITY_REVIEWED, locale) })}</p>
      </Section>
    </InfoPage>
  );
}

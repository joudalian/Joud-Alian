import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage, Section } from "@/components/InfoPage";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "care" });
  return pageMetadata({ locale, path: "/care", title: t("title"), description: t("intro") });
}

export default async function CarePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("care");
  return (
    <InfoPage locale={locale} path="/care" title={t("title")} intro={t("intro")}>
      {(["daily", "oil", "kitchen"] as const).map((key) => (
        <Section key={key} id={key} title={t(`${key}Title`)}>
          <p>{t(key)}</p>
        </Section>
      ))}
      <Section id="avoid" title={t("avoidTitle")}>
        <ul>
          {[1, 2, 3].map((n) => (
            <li key={n}>{t(`avoid${n}`)}</li>
          ))}
        </ul>
        <p>{t("variation")}</p>
      </Section>
    </InfoPage>
  );
}

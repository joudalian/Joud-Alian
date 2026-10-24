import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactTopics } from "@/components/ContactTopics";
import { contactTopics, type ContactTopic } from "@/lib/contact";
import { InfoPage, Section } from "@/components/InfoPage";
import { ADDRESS, CONTACT_EMAIL, OPENING_HOURS, SISTER_STORE, TIMEZONE_LABEL } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { formatOpeningDays } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return pageMetadata({ locale, path: "/contact", title: t("title"), description: t("intro") });
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const requested = (await searchParams).topic;
  const initial: ContactTopic = contactTopics.includes(requested as ContactTopic) ? (requested as ContactTopic) : "sales";
  const days = formatOpeningDays(locale);
  return (
    <InfoPage locale={locale} path="/contact" title={t("title")} intro={t("intro")}>
      <ContactTopics initial={initial} />
      {CONTACT_EMAIL && (
        <Section id="email" title={t("emailTitle")}>
          <p>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </Section>
      )}
      {ADDRESS && (
        <Section id="address" title={t("addressTitle")}>
          <address lang="en">{ADDRESS}</address>
          <p className="note">{t("addressNote")}</p>
        </Section>
      )}
      {days && (
        <Section id="hours" title={t("hoursTitle")}>
          <p>{t("hours", { days, open: OPENING_HOURS.open, close: OPENING_HOURS.close, timezone: TIMEZONE_LABEL[locale] })}</p>
          <p className="note">{t("hoursNote")}</p>
        </Section>
      )}
      <Section id="sister" title={t("sisterTitle")}>
        <p>
          {t.rich("sister", {
            link: (chunks) => (
              <a href={SISTER_STORE.url} rel="noopener noreferrer">
                {chunks}
              </a>
            ),
          })}
        </p>
      </Section>
    </InfoPage>
  );
}

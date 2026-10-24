import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeliveryTable } from "@/components/DeliveryTable";
import { InfoPage, Section } from "@/components/InfoPage";
import { DAMAGE_REPORT_DAYS, DELIVERY_TIME, LOST_PARCEL_DAYS, POLICY_UPDATED, PROCESSING_TIME, SHIP_FROM_TEXT } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shipping" });
  return pageMetadata({ locale, path: "/shipping", title: t("title"), description: t("intro") });
}

export default async function ShippingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shipping");
  return (
    <InfoPage locale={locale} path="/shipping" title={t("title")} intro={t("intro")} updated={POLICY_UPDATED}>
      <Section id="from" title={t("fromTitle")}>
        <p>{SHIP_FROM_TEXT[locale]}</p>
      </Section>
      <Section id="times" title={t("timesTitle")}>
        <p>{t("processing", { min: PROCESSING_TIME.min, max: PROCESSING_TIME.max })}</p>
        <p>{t("delivery", { min: DELIVERY_TIME.min, max: DELIVERY_TIME.max })}</p>
        <DeliveryTable caption={t("regionsTitle")} />
      </Section>
      <Section id="where" title={t("whereTitle")}>
        <p>{t("where")}</p>
      </Section>
      <Section id="cost" title={t("costTitle")}>
        <p>{t("cost")}</p>
      </Section>
      <Section id="customs" title={t("customsTitle")}>
        <p>{t("customs")}</p>
        <p>{t("customs2")}</p>
      </Section>
      <Section id="tracking" title={t("trackingTitle")}>
        <p>{t("tracking")}</p>
      </Section>
      <Section id="packing" title={t("packingTitle")}>
        <p>{t("packing")}</p>
      </Section>
      <Section id="not-shipped" title={t("notShippedTitle")}>
        <p>{t("notShipped")}</p>
      </Section>
      <Section id="lost" title={t("lostTitle")}>
        <p>{t("lost", { days: LOST_PARCEL_DAYS })}</p>
      </Section>
      <Section id="damaged" title={t("damagedTitle")}>
        <p>{t("damaged", { days: DAMAGE_REPORT_DAYS })}</p>
      </Section>
    </InfoPage>
  );
}

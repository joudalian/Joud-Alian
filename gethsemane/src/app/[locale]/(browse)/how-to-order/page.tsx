import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage } from "@/components/InfoPage";
import { OrderSteps } from "@/components/OrderSteps";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { STORE_NAME } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "howToOrder" });
  return pageMetadata({ locale, path: "/how-to-order", title: t("title"), description: t("intro") });
}

export default async function HowToOrderPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <InfoPage locale={locale} path="/how-to-order" title={t("howToOrder.title")} intro={t("howToOrder.intro")}>
      <OrderSteps />
      <div className="info-actions">
        <Link href="/shop" className="btn btn-primary">
          {t("howToOrder.cta")}
        </Link>
        <WhatsAppLink message={t("whatsapp.general", { store: STORE_NAME })} className="btn btn-secondary">
          {t("whatsapp.chat")}
        </WhatsAppLink>
      </div>
    </InfoPage>
  );
}

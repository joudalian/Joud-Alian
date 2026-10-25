import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/CartView";
import { OrderSteps } from "@/components/OrderSteps";
import { DELIVERY_TIME, PROCESSING_TIME, RETURN_DAYS, SHIP_FROM_TEXT, STORE_NAME } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { categories, categoryText } from "@/lib/catalog";
import { paymentText } from "@/lib/faq";
import { pageMetadata } from "@/lib/metadata";
import { orderLookup } from "@/lib/order-lookup";
import { whatsappUrl } from "@/lib/whatsapp";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return pageMetadata({ locale, path: "/cart", title: t("title"), noindex: true });
}

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const tFaq = await getTranslations("faq");
  return (
    <div className="container page">
      <h1>{t("cart.title")}</h1>
      <noscript>
        <p className="noscript-note">
          {t("cart.noscript")}{" "}
          <a href={whatsappUrl(t("whatsapp.general", { store: STORE_NAME }))} target="_blank" rel="noopener noreferrer">
            {t("whatsapp.chat")}
          </a>
        </p>
      </noscript>
      <CartView lookup={orderLookup(locale)} firstCategory={{ slug: categories[0]!.slug, name: categoryText(categories[0]!, locale).name }} />
      <div className="order-info">
        <section aria-labelledby="steps-title">
          <h2 id="steps-title">{t("cart.stepsTitle")}</h2>
          <OrderSteps headingLevel={3} />
        </section>
        <section aria-labelledby="policies-title" className="policy-summary">
          <h2 id="policies-title">{t("cart.policiesTitle")}</h2>
          <h3>{t("nav.shipping")}</h3>
          <p>{SHIP_FROM_TEXT[locale]}</p>
          <p>{t("shipping.processing", { min: PROCESSING_TIME.min, max: PROCESSING_TIME.max })}</p>
          <p>{t("product.shippingSummary", { min: DELIVERY_TIME.min, max: DELIVERY_TIME.max })}</p>
          <p>
            <Link href="/shipping">{t("product.readMore", { page: t("nav.shipping") })}</Link>
          </p>
          <h3>{t("nav.returns")}</h3>
          <p>{t("product.returnsSummary", { days: RETURN_DAYS })}</p>
          <p>
            <Link href="/returns">{t("product.readMore", { page: t("nav.returns") })}</Link>
          </p>
          <h3>{t("terms.paymentTitle")}</h3>
          <p>{paymentText(tFaq)}</p>
        </section>
      </div>
    </div>
  );
}

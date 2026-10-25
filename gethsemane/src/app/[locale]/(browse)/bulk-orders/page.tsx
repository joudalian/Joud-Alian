import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { InfoPage } from "@/components/InfoPage";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { getProduct, productText } from "@/lib/catalog";
import { countryOptions, COUNTRY_CODES } from "@/lib/countries";
import { pageMetadata } from "@/lib/metadata";
import { feature } from "@/server/features";
import { sendBulkEnquiry } from "./actions";
import "@/styles/forms.css";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "bulk" });
  return pageMetadata({ locale, path: "/bulk-orders", title: t("title"), description: t("intro") });
}

/** Enquiry form for churches, ministries, shops and groups (FEATURES.bulkOrders). No wholesale prices are shown. */
export default async function BulkOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!feature("bulkOrders")) notFound();
  const t = await getTranslations("bulk");
  const tc = await getTranslations("contact");
  const slug = (await searchParams).product;
  const product = typeof slug === "string" ? getProduct(slug) : undefined;
  return (
    <InfoPage locale={locale} path="/bulk-orders" title={t("title")} intro={t("intro")}>
      <p>{t("how")}</p>
      <ActionForm action={sendBulkEnquiry} submitLabel={t("send")} successOnly testId="bulk-form">
        <input type="hidden" name="locale" value={locale} />
        <Field name="organisation" label={t("organisation")} required autoComplete="organization" maxLength={150} hint={t("organisationHint")} />
        <Field name="name" label={tc("formName")} required autoComplete="name" maxLength={100} />
        <Field name="email" label={tc("formEmail")} type="email" required autoComplete="email" maxLength={254} inputMode="email" />
        <div className="field">
          <label htmlFor="f-country">{t("country")}</label>
          <select id="f-country" name="country" required defaultValue="" autoComplete="country">
            <option value="" disabled>
              {t("chooseCountry")}
            </option>
            {countryOptions(locale, [...COUNTRY_CODES]).map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-items">{t("items")}</label>
          <textarea id="f-items" name="items" rows={3} required minLength={3} maxLength={2000} defaultValue={product ? productText(product, locale).name : undefined} />
        </div>
        <Field name="quantity" label={t("quantity")} required maxLength={100} hint={t("quantityHint")} />
        <Field name="neededBy" label={t("neededBy")} type="date" optionalText={tc("formOptional")} />
        <div className="field">
          <label htmlFor="f-message">
            {t("message")} <span className="optional">({tc("formOptional")})</span>
          </label>
          <textarea id="f-message" name="message" rows={4} maxLength={5000} />
        </div>
        <div className="hp" aria-hidden="true">
          <label htmlFor="f-website">Website</label>
          <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="note">{tc.rich("formPrivacy", { link: (chunks) => <Link href="/privacy">{chunks}</Link> })}</p>
      </ActionForm>
    </InfoPage>
  );
}

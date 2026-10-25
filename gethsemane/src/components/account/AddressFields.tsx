import { getTranslations } from "next-intl/server";
import { Field } from "@/components/forms/Field";
import { SHIP_TO_COUNTRIES } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { COUNTRY_CODES, countryOptions } from "@/lib/countries";

export type AddressValues = { name: string; line1: string; line2: string; city: string; region: string; postalCode: string; country: string; phone: string };

/**
 * Shipping address inputs (address book and checkout). The country list is SHIP_TO_COUNTRIES when it is set,
 * otherwise every country. `prefix` namespaces the input names (e.g. "ship_").
 */
export async function AddressFields({
  locale,
  values,
  prefix = "",
  idPrefix = prefix,
}: {
  locale: Locale;
  values?: Partial<AddressValues>;
  prefix?: string;
  /** Distinct element ids when several address forms share a page (names stay the same). */
  idPrefix?: string;
}) {
  const t = await getTranslations({ locale, namespace: "address" });
  const countries = countryOptions(locale, SHIP_TO_COUNTRIES.length ? SHIP_TO_COUNTRIES : COUNTRY_CODES);
  const id = (name: string) => `f-${idPrefix}${name}`;
  const optional = t("optional");
  return (
    <fieldset className="address-fields">
      <Field id={id("name")} name={`${prefix}name`} label={t("name")} autoComplete="shipping name" required maxLength={100} defaultValue={values?.name} />
      <div className="field">
        <label htmlFor={id("country")}>{t("country")}</label>
        <select id={id("country")} name={`${prefix}country`} autoComplete="shipping country" required defaultValue={values?.country ?? ""}>
          <option value="" disabled>
            {t("countryChoose")}
          </option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <Field id={id("line1")} name={`${prefix}line1`} label={t("line1")} autoComplete="shipping address-line1" required maxLength={200} defaultValue={values?.line1} />
      <Field id={id("line2")} name={`${prefix}line2`} label={t("line2")} autoComplete="shipping address-line2" maxLength={200} defaultValue={values?.line2} optionalText={optional} />
      <div className="field-row">
        <Field id={id("postalCode")} name={`${prefix}postalCode`} label={t("postalCode")} autoComplete="shipping postal-code" maxLength={20} defaultValue={values?.postalCode} optionalText={optional} />
        <Field id={id("city")} name={`${prefix}city`} label={t("city")} autoComplete="shipping address-level2" required maxLength={100} defaultValue={values?.city} />
      </div>
      <Field id={id("region")} name={`${prefix}region`} label={t("region")} autoComplete="shipping address-level1" maxLength={100} defaultValue={values?.region} optionalText={optional} />
      <Field
        id={id("phone")}
        name={`${prefix}phone`}
        type="tel"
        label={t("phone")}
        autoComplete="shipping tel"
        inputMode="tel"
        maxLength={30}
        defaultValue={values?.phone}
        optionalText={optional}
        hint={t("phoneHint")}
      />
    </fieldset>
  );
}

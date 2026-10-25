import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountShell } from "@/components/account/AccountShell";
import { AddressFields } from "@/components/account/AddressFields";
import { AuthCard } from "@/components/account/AuthCard";
import { BackendNotice } from "@/components/account/BackendNotice";
import { ActionForm } from "@/components/forms/ActionForm";
import type { Locale } from "@/i18n/locales";
import { countryName } from "@/lib/countries";
import { pageMetadata } from "@/lib/metadata";
import { backendStatus, getDb } from "@/server/db";
import { addresses } from "@/server/db/schema";
import { requirePageUser } from "@/server/guards";
import { deleteAddress, makeDefaultAddress, saveAddress } from "../../actions";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ saved?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return pageMetadata({ locale, path: "/account/addresses", title: t("nav.addresses"), noindex: true });
}

export default async function AddressesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { saved } = await searchParams;
  const t = await getTranslations("account");
  if (backendStatus()) {
    return (
      <AuthCard title={t("nav.addresses")}>
        <BackendNotice />
      </AuthCard>
    );
  }
  const user = await requirePageUser(locale, "/account/addresses");
  const db = await getDb();
  const book = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
  return (
    <AccountShell locale={locale} current="/account/addresses" title={t("nav.addresses")}>
      {saved && (
        <p className="form-message form-success" role="status">
          {t("addressSaved")}
        </p>
      )}
      <p className="note">{t("addressesIntro")}</p>
      <ul className="address-list" data-testid="address-list">
        {book.map((a) => (
          <li key={a.id} className="address-card">
            <address>
              {[a.name, a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(" "), a.region, countryName(a.country, locale), a.phone]
                .filter(Boolean)
                .map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
            </address>
            {a.isDefault && <p className="tag">{t("defaultAddress")}</p>}
            <div className="address-actions">
              {!a.isDefault && (
                <form action={makeDefaultAddress}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="link-btn">
                    {t("makeDefault")}
                  </button>
                </form>
              )}
              <form action={deleteAddress}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" className="link-btn danger-link" aria-label={t("deleteAddressLabel", { name: a.name })}>
                  {t("deleteAddress")}
                </button>
              </form>
            </div>
            <details>
              <summary>{t("editAddress")}</summary>
              <ActionForm action={saveAddress} submitLabel={t("saveAddress")}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={a.id} />
                <AddressFields locale={locale} values={a} idPrefix={`a${a.id.slice(0, 8)}-`} />
                <DefaultBox label={t("setDefault")} checked={a.isDefault} id={`def-${a.id}`} />
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
      <section aria-labelledby="new-address" className="new-address">
        <h2 id="new-address">{t("addAddress")}</h2>
        <ActionForm action={saveAddress} submitLabel={t("saveAddress")} testId="address-form">
          <input type="hidden" name="locale" value={locale} />
          <AddressFields locale={locale} />
          <DefaultBox label={t("setDefault")} checked={book.length === 0} id="def-new" />
        </ActionForm>
      </section>
    </AccountShell>
  );
}

function DefaultBox({ label, checked, id }: { label: string; checked: boolean; id: string }) {
  return (
    <div className="field field-check">
      <input id={id} type="checkbox" name="isDefault" defaultChecked={checked} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

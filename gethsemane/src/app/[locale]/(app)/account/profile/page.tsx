import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountShell } from "@/components/account/AccountShell";
import { AuthCard } from "@/components/account/AuthCard";
import { BackendNotice } from "@/components/account/BackendNotice";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { DATA_RETENTION_YEARS } from "@/config/store";
import { localeNames, locales, type Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { PASSWORD_MIN } from "@/server/auth";
import { backendStatus } from "@/server/db";
import { requirePageUser } from "@/server/guards";
import { changePassword, deleteAccount, updateProfile } from "../../actions";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return pageMetadata({ locale, path: "/account/profile", title: t("nav.profile"), noindex: true });
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const ta = await getTranslations("auth");
  if (backendStatus()) {
    return (
      <AuthCard title={t("nav.profile")}>
        <BackendNotice />
      </AuthCard>
    );
  }
  const user = await requirePageUser(locale, "/account/profile");
  return (
    <AccountShell locale={locale} current="/account/profile" title={t("nav.profile")}>
      <section aria-labelledby="details-title" className="account-section">
        <h2 id="details-title">{t("detailsTitle")}</h2>
        <p className="note">{t("emailIs", { email: user.email })}</p>
        <ActionForm action={updateProfile} submitLabel={t("save")} testId="profile-form">
          <input type="hidden" name="locale" value={locale} />
          <Field name="name" label={ta("name")} autoComplete="name" required maxLength={100} defaultValue={user.name} />
          <div className="field">
            <label htmlFor="f-language">{t("language")}</label>
            <select id="f-language" name="language" defaultValue={user.locale}>
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
            <p className="note field-hint">{t("languageHint")}</p>
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="password-title" className="account-section">
        <h2 id="password-title">{t("passwordTitle")}</h2>
        <ActionForm action={changePassword} submitLabel={t("changePassword")} testId="password-form">
          <input type="hidden" name="locale" value={locale} />
          <Field name="currentPassword" type="password" label={t("currentPassword")} autoComplete="current-password" required maxLength={128} />
          <Field
            name="newPassword"
            type="password"
            label={ta("newPassword")}
            autoComplete="new-password"
            required
            minLength={PASSWORD_MIN}
            maxLength={128}
            hint={ta("passwordRule", { min: PASSWORD_MIN })}
          />
          <Field name="confirm" type="password" label={ta("confirmPassword")} autoComplete="new-password" required maxLength={128} />
        </ActionForm>
      </section>

      <section aria-labelledby="data-title" className="account-section">
        <h2 id="data-title">{t("dataTitle")}</h2>
        <p>{t("exportText")}</p>
        <p>
          <a href="/api/account/export" className="btn btn-secondary" download data-testid="export-data">
            {t("exportButton")}
          </a>
        </p>
      </section>

      <section aria-labelledby="delete-title" className="account-section danger-zone">
        <h2 id="delete-title">{t("deleteTitle")}</h2>
        <p>{t("deleteText")}</p>
        <p>{DATA_RETENTION_YEARS > 0 ? t("deleteKeptYears", { years: DATA_RETENTION_YEARS }) : t("deleteKept")}</p>
        <ActionForm action={deleteAccount} submitLabel={t("deleteButton")} testId="delete-form">
          <input type="hidden" name="locale" value={locale} />
          <Field id="f-delete-password" name="password" type="password" label={t("currentPassword")} autoComplete="current-password" required maxLength={128} />
          <Field id="f-delete-confirm" name="confirm" label={t("deleteTypeWord", { word: t("deleteWord") })} required autoComplete="off" maxLength={20} />
        </ActionForm>
      </section>
    </AccountShell>
  );
}

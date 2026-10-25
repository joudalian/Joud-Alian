import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/account/AuthCard";
import { BackendNotice } from "@/components/account/BackendNotice";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { PASSWORD_MIN } from "@/server/auth";
import { backendStatus } from "@/server/db";
import { resetPassword } from "../actions";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ token?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return pageMetadata({ locale, path: "/reset-password", title: t("resetTitle"), noindex: true });
}

export default async function ResetPasswordPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token = "", error } = await searchParams;
  const t = await getTranslations("auth");
  const valid = token && !error;
  return (
    <AuthCard title={t("resetTitle")}>
      {backendStatus() ? (
        <BackendNotice />
      ) : valid ? (
        <>
          <ActionForm action={resetPassword} submitLabel={t("resetButton")} successOnly testId="reset-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="token" value={token} />
            <Field
              name="password"
              type="password"
              label={t("newPassword")}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              maxLength={128}
              hint={t("passwordRule", { min: PASSWORD_MIN })}
            />
            <Field name="confirm" type="password" label={t("confirmPassword")} autoComplete="new-password" required maxLength={128} />
          </ActionForm>
          <p className="auth-links">
            <Link href="/login">{t("backToLogin")}</Link>
          </p>
        </>
      ) : (
        <>
          <p className="form-message form-error" role="alert">
            {t("resetInvalid")}
          </p>
          <p>
            <Link href="/forgot-password" className="btn btn-primary">
              {t("forgotButton")}
            </Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}

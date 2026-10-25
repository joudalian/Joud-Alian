import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/account/AuthCard";
import { BackendNotice } from "@/components/account/BackendNotice";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { backendStatus } from "@/server/db";
import { forgotPassword } from "../actions";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return pageMetadata({ locale, path: "/forgot-password", title: t("forgotTitle"), noindex: true });
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("forgotTitle")} intro={t("forgotIntro")}>
      {backendStatus() ? (
        <BackendNotice />
      ) : (
        <>
          <ActionForm action={forgotPassword} submitLabel={t("forgotButton")} successOnly testId="forgot-form">
            <input type="hidden" name="locale" value={locale} />
            <Field name="email" type="email" label={t("email")} autoComplete="email" inputMode="email" required maxLength={254} />
          </ActionForm>
          <p className="auth-links">
            <Link href="/login">{t("backToLogin")}</Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}

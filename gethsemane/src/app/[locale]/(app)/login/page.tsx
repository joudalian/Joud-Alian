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
import { logIn } from "../actions";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ next?: string; reset?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return pageMetadata({ locale, path: "/login", title: t("loginTitle"), noindex: true });
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next = "" } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("loginTitle")} intro={t("loginIntro")}>
      {backendStatus() ? (
        <BackendNotice />
      ) : (
        <>
          <ActionForm action={logIn} submitLabel={t("loginButton")} testId="login-form">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="next" value={next} />
            <Field name="email" type="email" label={t("email")} autoComplete="email" inputMode="email" required maxLength={254} />
            <Field name="password" type="password" label={t("password")} autoComplete="current-password" required maxLength={128} />
          </ActionForm>
          <p className="auth-links">
            <Link href="/forgot-password">{t("forgotLink")}</Link>
            <span>
              {t("noAccount")} <Link href="/signup">{t("signupLink")}</Link>
            </span>
            <Link href="/track-order">{t("trackLink")}</Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}

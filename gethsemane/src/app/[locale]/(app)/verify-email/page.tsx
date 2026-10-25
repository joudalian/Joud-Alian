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
import { resendVerification } from "../actions";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ status?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return pageMetadata({ locale, path: "/verify-email", title: t("verifyTitle"), noindex: true });
}

/** Landing page of the verification link (Better Auth verifies, signs in and redirects here), and "send it again". */
export default async function VerifyEmailPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status, error } = await searchParams;
  const t = await getTranslations("auth");
  if (backendStatus()) {
    return (
      <AuthCard title={t("verifyTitle")}>
        <BackendNotice />
      </AuthCard>
    );
  }
  if (status === "verified" && !error) {
    return (
      <AuthCard title={t("verifiedTitle")}>
        <p className="form-message form-success" role="status" data-testid="verified">
          {t("verifiedText")}
        </p>
        <p>
          <Link href="/account" className="btn btn-primary">
            {t("goToAccount")}
          </Link>
        </p>
      </AuthCard>
    );
  }
  return (
    <AuthCard title={t("verifyTitle")} intro={error ? t("verifyExpired") : t("verifyIntro")}>
      <ActionForm action={resendVerification} submitLabel={t("verifyResend")} successOnly testId="verify-form">
        <input type="hidden" name="locale" value={locale} />
        <Field name="email" type="email" label={t("email")} autoComplete="email" inputMode="email" required maxLength={254} />
      </ActionForm>
    </AuthCard>
  );
}

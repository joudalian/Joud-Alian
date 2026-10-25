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
import { signUp } from "../actions";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return pageMetadata({ locale, path: "/signup", title: t("signupTitle"), noindex: true });
}

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("signupTitle")} intro={t("signupIntro")}>
      {backendStatus() ? (
        <BackendNotice />
      ) : (
        <>
          <ActionForm action={signUp} submitLabel={t("signupButton")} successOnly testId="signup-form">
            <input type="hidden" name="locale" value={locale} />
            {/* Honeypot: hidden from people, filled in by bots. */}
            <div className="hp" aria-hidden="true">
              <label htmlFor="f-website">Website</label>
              <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <Field name="name" label={t("name")} autoComplete="name" required maxLength={100} />
            <Field name="email" type="email" label={t("email")} autoComplete="email" inputMode="email" required maxLength={254} />
            <Field
              name="password"
              type="password"
              label={t("password")}
              autoComplete="new-password"
              required
              minLength={PASSWORD_MIN}
              maxLength={128}
              hint={t("passwordRule", { min: PASSWORD_MIN })}
            />
            <p className="note">
              {t.rich("signupPrivacy", { link: (chunks) => <Link href="/privacy">{chunks}</Link> })}
            </p>
          </ActionForm>
          <p className="auth-links">
            <span>
              {t("haveAccount")} <Link href="/login">{t("loginLink")}</Link>
            </span>
          </p>
          <p className="note">{t("guestNote")}</p>
        </>
      )}
    </AuthCard>
  );
}

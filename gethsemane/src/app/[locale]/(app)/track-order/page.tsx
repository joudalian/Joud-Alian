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
import { trackOrder } from "../actions";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "track" });
  return pageMetadata({ locale, path: "/track-order", title: t("title"), noindex: true });
}

export default async function TrackOrderPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("track");
  return (
    <AuthCard title={t("title")} intro={t("intro")}>
      {backendStatus() ? (
        <BackendNotice />
      ) : (
        <>
          <ActionForm action={trackOrder} submitLabel={t("button")} testId="track-form">
            <input type="hidden" name="locale" value={locale} />
            <Field name="number" label={t("number")} required maxLength={20} hint={t("numberHint")} autoComplete="off" />
            <Field name="email" type="email" label={t("email")} autoComplete="email" inputMode="email" required maxLength={254} />
          </ActionForm>
          <p className="auth-links">
            <span>
              {t("haveAccount")} <Link href="/account/orders">{t("accountLink")}</Link>
            </span>
          </p>
        </>
      )}
    </AuthCard>
  );
}

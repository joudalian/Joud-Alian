import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/account/AuthCard";
import { DATA_RETENTION_YEARS } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return pageMetadata({ locale, path: "/account/deleted", title: t("deletedTitle"), noindex: true });
}

export default async function AccountDeletedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  return (
    <AuthCard title={t("deletedTitle")}>
      <p role="status" data-testid="account-deleted">
        {t("deletedText")}
      </p>
      <p>{DATA_RETENTION_YEARS > 0 ? t("deleteKeptYears", { years: DATA_RETENTION_YEARS }) : t("deleteKept")}</p>
      <p>
        <Link href="/" className="btn btn-primary">
          {t("backHome")}
        </Link>
      </p>
    </AuthCard>
  );
}

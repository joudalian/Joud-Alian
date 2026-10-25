import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountShell } from "@/components/account/AccountShell";
import { AuthCard } from "@/components/account/AuthCard";
import { BackendNotice } from "@/components/account/BackendNotice";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { backendStatus } from "@/server/db";
import { requirePageUser } from "@/server/guards";
import { ordersForUser } from "@/server/orders";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return pageMetadata({ locale, path: "/account", title: t("title"), noindex: true });
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  if (backendStatus()) {
    return (
      <AuthCard title={t("title")}>
        <BackendNotice />
      </AuthCard>
    );
  }
  const user = await requirePageUser(locale, "/account");
  const recent = (await ordersForUser(user.id)).slice(0, 1);
  return (
    <AccountShell locale={locale} current="/account" title={t("title")}>
      <p data-testid="account-greeting">{t("greeting", { name: user.name })}</p>
      <p>{t("dashboardIntro")}</p>
      <ul className="account-tiles">
        <li>
          <Link href="/account/orders">{t("nav.orders")}</Link>
          {recent[0] && <span className="note">{t("lastOrder", { number: recent[0].number })}</span>}
        </li>
        <li>
          <Link href="/account/addresses">{t("nav.addresses")}</Link>
        </li>
        <li>
          <Link href="/account/profile">{t("nav.profile")}</Link>
        </li>
        <li>
          <Link href="/shop">{t("continueShopping")}</Link>
        </li>
      </ul>
    </AccountShell>
  );
}

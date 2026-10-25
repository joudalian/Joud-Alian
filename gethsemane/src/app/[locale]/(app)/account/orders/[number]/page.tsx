import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountShell } from "@/components/account/AccountShell";
import { AuthCard } from "@/components/account/AuthCard";
import { BackendNotice } from "@/components/account/BackendNotice";
import { OrderDetails } from "@/components/account/OrderDetails";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { backendStatus } from "@/server/db";
import { requirePageUser } from "@/server/guards";
import { orderForUser } from "@/server/orders";

type Props = { params: Promise<{ locale: Locale; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, number } = await params;
  const t = await getTranslations({ locale, namespace: "order" });
  return pageMetadata({ locale, path: `/account/orders/${number}`, title: t("titleNumber", { number }), noindex: true });
}

export default async function AccountOrderPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("order");
  if (backendStatus()) {
    return (
      <AuthCard title={t("titleNumber", { number })}>
        <BackendNotice />
      </AuthCard>
    );
  }
  const user = await requirePageUser(locale, `/account/orders/${number}`);
  const order = await orderForUser(user.id, number);
  if (!order) notFound();
  return (
    <AccountShell locale={locale} current="/account/orders" title={t("titleNumber", { number: order.number })}>
      <OrderDetails order={order} locale={locale} />
      <p>
        <Link href="/account/orders">{t("backToOrders")}</Link>
      </p>
    </AccountShell>
  );
}

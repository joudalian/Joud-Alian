import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackendNotice } from "@/components/account/BackendNotice";
import { OrderDetails } from "@/components/account/OrderDetails";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { backendStatus } from "@/server/db";
import { orderByAccessKey } from "@/server/orders";

type Props = { params: Promise<{ locale: Locale; number: string }>; searchParams: Promise<{ key?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, number } = await params;
  const t = await getTranslations({ locale, namespace: "order" });
  return pageMetadata({ locale, path: `/track-order/${number}`, title: t("titleNumber", { number }), noindex: true });
}

/** An order's status for whoever holds its link (order number + secret key from the email or the tracking form). */
export default async function TrackedOrderPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const { key = "" } = await searchParams;
  const t = await getTranslations("order");
  if (backendStatus()) return <BackendNotice />;
  const order = await orderByAccessKey(number, key);
  if (!order || order.status === "pending_payment") notFound();
  return (
    <div className="container page account-page">
      <h1>{t("titleNumber", { number: order.number })}</h1>
      <OrderDetails order={order} locale={locale} />
      <p>
        <Link href="/track-order">{t("trackAnother")}</Link>
      </p>
    </div>
  );
}

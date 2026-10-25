import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackendNotice } from "@/components/account/BackendNotice";
import { OrderDetails } from "@/components/account/OrderDetails";
import { ClearCart } from "@/components/checkout/ClearCart";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { backendStatus } from "@/server/db";
import { orderByAccessKey } from "@/server/orders";

type Props = { params: Promise<{ locale: Locale; number: string }>; searchParams: Promise<{ key?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return pageMetadata({ locale, path: "/order", title: t("thanksTitle"), noindex: true });
}

/**
 * Where Stripe sends the customer after paying. It only shows what the webhook recorded: if the payment
 * confirmation has not arrived yet, it says so (and offers a refresh); it never marks the order paid itself.
 */
export default async function ConfirmationPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const { key = "" } = await searchParams;
  const t = await getTranslations("checkout");
  if (backendStatus()) return <BackendNotice />;
  const order = await orderByAccessKey(number, key);
  if (!order) notFound();
  const pending = order.status === "pending_payment";
  return (
    <div className="container page account-page">
      <ClearCart />
      <h1>{pending ? t("confirmingTitle") : t("thanksTitle")}</h1>
      {pending ? (
        <div className="notice-card" role="status" data-testid="confirming">
          <p>{t("confirmingText")}</p>
          <p>
            <a href={`/${locale}/order/${order.number}/confirmation?key=${encodeURIComponent(key)}`} className="btn btn-secondary">
              {t("refresh")}
            </a>
          </p>
        </div>
      ) : (
        <p className="lead" data-testid="thanks">
          {t("thanksText", { email: order.email })}
        </p>
      )}
      <OrderDetails order={order} locale={locale} />
      <p className="note">{t("keepLink")}</p>
      <p>
        <Link href="/shop">{t("toShop")}</Link>
      </p>
    </div>
  );
}

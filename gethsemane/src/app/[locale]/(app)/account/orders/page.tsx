import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountShell } from "@/components/account/AccountShell";
import { AuthCard } from "@/components/account/AuthCard";
import { BackendNotice } from "@/components/account/BackendNotice";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { formatPrice } from "@/lib/currency";
import { pageMetadata } from "@/lib/metadata";
import { backendStatus } from "@/server/db";
import { requirePageUser } from "@/server/guards";
import { ordersForUser } from "@/server/orders";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return pageMetadata({ locale, path: "/account/orders", title: t("nav.orders"), noindex: true });
}

export default async function OrdersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const to = await getTranslations("order");
  if (backendStatus()) {
    return (
      <AuthCard title={t("nav.orders")}>
        <BackendNotice />
      </AuthCard>
    );
  }
  const user = await requirePageUser(locale, "/account/orders");
  const list = await ordersForUser(user.id);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  return (
    <AccountShell locale={locale} current="/account/orders" title={t("nav.orders")}>
      {list.length === 0 ? (
        <div className="empty-state">
          <p>{t("noOrders")}</p>
          <Link href="/shop" className="btn btn-primary">
            {t("continueShopping")}
          </Link>
        </div>
      ) : (
        <table className="order-table orders-list" data-testid="orders-list">
          <thead>
            <tr>
              <th scope="col">{to("number")}</th>
              <th scope="col">{to("date")}</th>
              <th scope="col">{to("statusLabel")}</th>
              <th scope="col">{to("total")}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/account/orders/${o.number}`}>{o.number}</Link>
                </td>
                <td>{date.format(o.createdAt)}</td>
                <td>
                  <span className={`status status-${o.status}`}>{to(`status.${o.status}`)}</span>
                </td>
                <td>{formatPrice(o.totalCents / 100, "USD", locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AccountShell>
  );
}

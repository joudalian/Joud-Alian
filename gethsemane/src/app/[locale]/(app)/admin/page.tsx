import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminShell, adminMetadata } from "@/components/admin/AdminShell";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { formatPrice } from "@/lib/currency";
import { adminOrders } from "@/server/admin";
import { ORDER_STATUSES } from "@/server/db/schema";
import { requireAdmin } from "@/server/guards";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ status?: string; q?: string; test?: string }> };

export const metadata = adminMetadata("Orders");

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin())) notFound();
  const { status = "", q = "", test = "" } = await searchParams;
  const list = await adminOrders({ status, q, test: test === "only" || test === "hide" ? test : undefined });
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return (
    <AdminShell current="/admin" title="Orders">
      <form className="admin-filters" method="get" role="search" aria-label="Filter orders">
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" name="status" defaultValue={status}>
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-q">Number, email or name</label>
          <input id="f-q" name="q" type="search" defaultValue={q} maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="f-test">Test orders</label>
          <select id="f-test" name="test" defaultValue={test}>
            <option value="">Show</option>
            <option value="hide">Hide</option>
            <option value="only">Only</option>
          </select>
        </div>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>
      {list.length === 0 ? (
        <p data-testid="admin-no-orders">No orders match.</p>
      ) : (
        <table className="order-table orders-list" data-testid="admin-orders">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Date (UTC)</th>
              <th scope="col">Customer</th>
              <th scope="col">Status</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.number}`}>{o.number}</Link>
                  {o.testMode && <span className="item-detail">TEST</span>}
                </td>
                <td>{date.format(o.createdAt)}</td>
                <td>
                  {o.shipName}
                  <span className="item-detail">
                    {o.email} · {o.shipCountry}
                  </span>
                </td>
                <td>
                  <span className={`status status-${o.status}`}>{o.status}</span>
                </td>
                <td>{formatPrice(o.totalCents / 100, "USD", "en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminShell>
  );
}

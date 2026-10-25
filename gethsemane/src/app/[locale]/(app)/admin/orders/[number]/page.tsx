import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminShell, adminMetadata } from "@/components/admin/AdminShell";
import { OrderDetails } from "@/components/account/OrderDetails";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { allowedStatuses } from "@/server/admin";
import { requireAdmin } from "@/server/guards";
import { orderByNumber } from "@/server/orders";
import { addNote, markShipped, updateStatus } from "../../actions";

type Props = { params: Promise<{ locale: Locale; number: string }> };

export const metadata = adminMetadata("Order");

export default async function AdminOrderPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin())) notFound();
  const order = await orderByNumber(number, true);
  if (!order) notFound();
  const statuses = allowedStatuses(order.status);
  const canShip = ["paid", "processing", "shipped"].includes(order.status);
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return (
    <AdminShell current="/admin" title={`Order ${order.number}`}>
      <p>
        <Link href="/admin">← All orders</Link>
      </p>
      <dl className="order-meta admin-meta">
        <div>
          <dt>Email</dt>
          <dd data-testid="admin-email">{order.email}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{order.shipPhone || "—"}</dd>
        </div>
        <div>
          <dt>Language</dt>
          <dd>{order.locale}</dd>
        </div>
        <div>
          <dt>Shipping</dt>
          <dd>
            {order.shippingRegion} / {order.shippingMethod}
          </dd>
        </div>
        <div>
          <dt>Stripe</dt>
          <dd className="break">{order.stripePaymentIntentId ?? order.stripeSessionId ?? "—"}</dd>
        </div>
        <div>
          <dt>Account</dt>
          <dd>{order.userId ? "Customer account" : "Guest"}</dd>
        </div>
      </dl>
      <OrderDetails order={order} locale="en" />

      <section className="admin-actions" aria-labelledby="admin-actions-title">
        <h2 id="admin-actions-title">Update</h2>
        {canShip && (
          <ActionForm action={markShipped} submitLabel="Mark as shipped" testId="admin-ship">
            <input type="hidden" name="number" value={order.number} />
            <Field name="carrier" label="Carrier" required maxLength={80} defaultValue={order.carrier ?? ""} id="f-carrier" />
            <Field name="tracking" label="Tracking number" required maxLength={120} defaultValue={order.trackingNumber ?? ""} id="f-tracking" />
            <div className="check-row">
              <input type="checkbox" id="f-notify" name="notify" defaultChecked />
              <label htmlFor="f-notify">Email the customer the carrier and tracking number</label>
            </div>
          </ActionForm>
        )}
        {statuses.length > 0 && (
          <ActionForm action={updateStatus} submitLabel="Set status" testId="admin-status">
            <input type="hidden" name="number" value={order.number} />
            <div className="field">
              <label htmlFor="f-status">New status</label>
              <select id="f-status" name="status" required defaultValue="">
                <option value="" disabled>
                  Choose…
                </option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <p className="note field-hint">“paid” and “refunded” are set only by Stripe. Refund in the Stripe Dashboard; the order updates itself.</p>
            </div>
          </ActionForm>
        )}
        <ActionForm action={addNote} submitLabel="Add internal note" testId="admin-note">
          <input type="hidden" name="number" value={order.number} />
          <div className="field">
            <label htmlFor="f-note">Internal note (never shown to the customer)</label>
            <textarea id="f-note" name="note" rows={3} maxLength={2000} required />
          </div>
        </ActionForm>
      </section>

      <section aria-labelledby="internal-title">
        <h2 id="internal-title">Internal log</h2>
        <ol className="order-history" data-testid="admin-log">
          {order.events
            .filter((e) => e.internal)
            .map((e) => (
              <li key={e.id}>
                <time dateTime={e.createdAt.toISOString()}>{when.format(e.createdAt)}</time> — {e.type}
                {e.message ? `: ${e.message}` : ""} <span className="note">({e.actor})</span>
              </li>
            ))}
        </ol>
      </section>
    </AdminShell>
  );
}

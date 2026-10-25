import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminShell, adminMetadata } from "@/components/admin/AdminShell";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import type { Locale } from "@/i18n/locales";
import { formatPrice } from "@/lib/currency";
import { adminCoupons } from "@/server/admin";
import { requireAdmin } from "@/server/guards";
import { addCoupon, toggleCoupon } from "../actions";

type Props = { params: Promise<{ locale: Locale }> };

export const metadata = adminMetadata("Coupons");

const usd = (cents: number) => formatPrice(cents / 100, "USD", "en");

export default async function AdminCouponsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin())) notFound();
  const list = await adminCoupons();
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
  return (
    <AdminShell current="/admin/coupons" title="Coupons">
      <p className="note">Coupons are off until you create one. Customers enter the code at checkout; the discount is applied on the server.</p>
      {list.length === 0 ? (
        <p data-testid="admin-no-coupons">No coupons yet.</p>
      ) : (
        <table className="order-table" data-testid="admin-coupons">
          <thead>
            <tr>
              <th scope="col">Code</th>
              <th scope="col">Discount</th>
              <th scope="col">Rules</th>
              <th scope="col">Used</th>
              <th scope="col">Active</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>{c.code}</td>
                <td>{c.kind === "percent" ? `${c.amount}%` : usd(c.amount)}</td>
                <td>
                  {[
                    c.minSubtotalCents ? `min ${usd(c.minSubtotalCents)}` : "",
                    c.expiresAt ? `until ${date.format(c.expiresAt)}` : "",
                    c.email ? `only ${c.email}` : "",
                    c.singleUsePerEmail ? "once per email" : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td>
                  {c.usedCount}
                  {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                </td>
                <td>
                  <form action={toggleCoupon}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                    <button type="submit" className="link-btn" aria-label={`${c.active ? "Disable" : "Enable"} ${c.code}`}>
                      {c.active ? "Yes — disable" : "No — enable"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>New coupon</h2>
      <ActionForm action={addCoupon} submitLabel="Create coupon" testId="admin-coupon-form">
        <Field name="code" label="Code" required maxLength={40} pattern="[A-Za-z0-9_\-]{3,40}" id="f-code" hint="Letters, digits, - or _. Stored in capitals." />
        <div className="field">
          <label htmlFor="f-kind">Type</label>
          <select id="f-kind" name="kind" defaultValue="percent">
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount (USD)</option>
          </select>
        </div>
        <Field name="amount" label="Amount (percent, or USD)" required inputMode="numeric" id="f-amount" />
        <Field name="minSubtotal" label="Minimum items total in USD" optionalText="optional" id="f-min" />
        <Field name="expiresAt" label="Expires after (date, UTC)" type="date" optionalText="optional" id="f-expires" />
        <Field name="usageLimit" label="Usage limit (number of orders)" optionalText="optional" inputMode="numeric" id="f-limit" />
      </ActionForm>
    </AdminShell>
  );
}

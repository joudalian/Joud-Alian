import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminShell, adminMetadata } from "@/components/admin/AdminShell";
import type { Locale } from "@/i18n/locales";
import { countryName } from "@/lib/countries";
import { adminEnquiries } from "@/server/admin";
import { feature } from "@/server/features";
import { requireAdmin } from "@/server/guards";
import { toggleEnquiry } from "../actions";

type Props = { params: Promise<{ locale: Locale }> };

export const metadata = adminMetadata("Bulk enquiries");

export default async function AdminEnquiriesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin()) || !feature("bulkOrders")) notFound();
  const list = await adminEnquiries();
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return (
    <AdminShell current="/admin/enquiries" title="Bulk enquiries">
      <p className="note">From the /bulk-orders form. Each one was also emailed to you; reply to the customer by email with a quote.</p>
      {list.length === 0 ? (
        <p data-testid="admin-no-enquiries">No enquiries yet.</p>
      ) : (
        <ul className="plain-list admin-enquiries" data-testid="admin-enquiries">
          {list.map((e) => (
            <li key={e.id} className="admin-card">
              <h2 className="small-heading">
                {e.organisation} · {countryName(e.country, "en")}
              </h2>
              <p className="note">
                {date.format(e.createdAt)} UTC · {e.name} · <a href={`mailto:${e.email}`}>{e.email}</a> · {e.locale}
              </p>
              <dl className="specs">
                <div className="spec-row">
                  <dt>Pieces</dt>
                  <dd className="break">{e.items}</dd>
                </div>
                <div className="spec-row">
                  <dt>Quantity</dt>
                  <dd>{e.quantity}</dd>
                </div>
                <div className="spec-row">
                  <dt>Needed by</dt>
                  <dd>{e.neededBy ?? "—"}</dd>
                </div>
              </dl>
              {e.message && <p className="break">{e.message}</p>}
              <form action={toggleEnquiry}>
                <input type="hidden" name="id" value={e.id} />
                <input type="hidden" name="handled" value={e.handled ? "false" : "true"} />
                <button type="submit" className="link-btn" aria-label={`${e.handled ? "Mark as open" : "Mark as handled"}: ${e.organisation}`}>
                  {e.handled ? "Handled — reopen" : "Open — mark as handled"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

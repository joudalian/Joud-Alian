import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminShell, adminMetadata } from "@/components/admin/AdminShell";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { feature } from "@/server/features";
import { requireAdmin } from "@/server/guards";
import { adminReviews, MIN_REVIEWS_SHOWN } from "@/server/reviews";
import { moderateReview } from "../actions";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ status?: string }> };

export const metadata = adminMetadata("Reviews");

const STATUSES = ["pending", "approved", "rejected"] as const;

export default async function AdminReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin()) || !feature("reviews")) notFound();
  const requested = (await searchParams).status;
  const status = STATUSES.find((s) => s === requested) ?? "pending";
  const list = await adminReviews(status);
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
  return (
    <AdminShell current="/admin/reviews" title="Reviews">
      <p className="note">
        Only buyers of a delivered order can write a review (from the emailed link). A product shows its reviews once it has {MIN_REVIEWS_SHOWN} approved
        ones. Approve only genuine reviews; never edit their text.
      </p>
      <p>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/reviews?status=${s}`} aria-current={s === status ? "page" : undefined} className="text-link admin-tab">
            {s}
          </Link>
        ))}
      </p>
      {list.length === 0 ? (
        <p data-testid="admin-no-reviews">No {status} reviews.</p>
      ) : (
        <ul className="plain-list" data-testid="admin-reviews">
          {list.map((r) => (
            <li key={r.id} className="admin-card">
              <p className="note">
                {r.productSlug} · {r.number} · {date.format(r.createdAt)} · {r.displayName}
              </p>
              <p>
                <strong>{r.rating} of 5</strong> — <span className="break">{r.body}</span>
              </p>
              {r.hasPhoto && (
                // eslint-disable-next-line @next/next/no-img-element -- a private, re-encoded upload served by our own route
                <img src={`/api/review-photo/${r.id}`} alt={`Photo from ${r.displayName}`} width={160} height={160} className="admin-photo" />
              )}
              <div className="admin-review-actions">
                {(["approved", "rejected"] as const)
                  .filter((s) => s !== r.status)
                  .map((s) => (
                    <form key={s} action={moderateReview}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={s} />
                      <button type="submit" className="btn btn-secondary" aria-label={`${s === "approved" ? "Approve" : "Reject"} review by ${r.displayName}`}>
                        {s === "approved" ? "Approve" : "Reject"}
                      </button>
                    </form>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

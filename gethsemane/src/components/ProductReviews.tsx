import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import type { PublicReview } from "@/server/reviews";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width="16" height="16" viewBox="0 0 24 24" className={n <= Math.round(rating) ? "star-on" : "star-off"}>
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
      ))}
    </span>
  );
}

/** Approved reviews from verified buyers (FEATURES.reviews; only rendered from MIN_REVIEWS_SHOWN reviews). */
export async function ProductReviews({ data, locale }: { data: { reviews: PublicReview[]; average: number }; locale: Locale }) {
  const t = await getTranslations("reviews");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
  const average = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(data.average);
  return (
    <section className="section product-reviews" aria-labelledby="reviews-title" data-testid="product-reviews">
      <h2 id="reviews-title">{t("sectionTitle")}</h2>
      <p className="reviews-summary">
        <Stars rating={data.average} /> {t("summary", { average, count: data.reviews.length })}
      </p>
      <ul className="plain-list review-list">
        {data.reviews.map((r) => (
          <li key={r.id} className="review" lang={r.locale}>
            <p className="review-meta">
              <Stars rating={r.rating} /> <span className="sr-only">{t("ratingValue", { rating: r.rating })} · </span>
              <strong>{r.displayName}</strong> · {t("verified")} · <time dateTime={r.createdAt.toISOString()}>{date.format(r.createdAt)}</time>
            </p>
            <p>{r.body}</p>
            {r.hasPhoto && (
              // eslint-disable-next-line @next/next/no-img-element -- a re-encoded buyer photo served by our own route
              <img src={`/api/review-photo/${r.id}`} alt={t("photoAlt", { name: r.displayName })} width={240} height={240} loading="lazy" className="review-photo" />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/account/AuthCard";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { feature } from "@/server/features";
import { reviewContext } from "@/server/reviews";
import { optOut, submitReview } from "./actions";

type Props = { params: Promise<{ locale: Locale; token: string }>; searchParams: Promise<{ optout?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return pageMetadata({ locale, path: `/review/${token}`, title: t("title"), noindex: true });
}

/** Write a review: reached only from the review-request email of a delivered order (FEATURES.reviews). */
export default async function ReviewPage({ params, searchParams }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reviews");
  if ((await searchParams).optout) {
    return (
      <AuthCard title={t("optOutTitle")}>
        <ActionForm action={optOut} submitLabel={t("optOutButton")} successOnly testId="review-optout">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={token} />
          <p>{t("optOutText")}</p>
        </ActionForm>
      </AuthCard>
    );
  }
  if (!feature("reviews")) notFound();
  const context = await reviewContext(token);
  if (!context) notFound();
  const open = context.products.filter((p) => !context.reviewed.has(p.slug));
  return (
    <AuthCard title={t("title")} intro={t("intro", { number: context.order.number })}>
      {open.length === 0 ? (
        <p data-testid="review-done">{t("allDone")}</p>
      ) : (
        <ActionForm action={submitReview} submitLabel={t("submit")} successOnly testId="review-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={token} />
          <div className="field">
            <label htmlFor="f-product">{t("product")}</label>
            <select id="f-product" name="product" required>
              {open.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <fieldset className="choice-list rating-choice">
            <legend>{t("rating")}</legend>
            {[5, 4, 3, 2, 1].map((n) => (
              <label key={n} className="choice">
                <input type="radio" name="rating" value={n} required />
                <span>{t("ratingValue", { rating: n })}</span>
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="f-body">{t("body")}</label>
            <textarea id="f-body" name="body" rows={5} required minLength={10} maxLength={2000} />
          </div>
          <Field name="displayName" label={t("displayName")} required maxLength={40} hint={t("displayNameHint")} defaultValue={context.order.shipName.split(" ")[0]} />
          <div className="field">
            <label htmlFor="f-photo">
              {t("photo")} <span className="optional">({t("optional")})</span>
            </label>
            <input id="f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="f-photo-hint" />
            <p className="note field-hint" id="f-photo-hint">
              {t("photoHint")}
            </p>
          </div>
          <p className="note">{t("moderation")}</p>
        </ActionForm>
      )}
    </AuthCard>
  );
}

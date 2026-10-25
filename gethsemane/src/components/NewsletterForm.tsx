import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { subscribeNewsletter } from "@/app/[locale]/(app)/newsletter/actions";

/** Newsletter sign-up (FEATURES.newsletter): a plain form post, no script; double opt-in follows by email. */
export async function NewsletterForm({ idPrefix = "nl" }: { idPrefix?: string }) {
  const t = await getTranslations("newsletter");
  const locale = await getLocale();
  return (
    <form action={subscribeNewsletter} className="newsletter-form" data-testid="newsletter-form">
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor={`${idPrefix}-email`}>{t("label")}</label>
      <div className="newsletter-row">
        <input id={`${idPrefix}-email`} name="email" type="email" required autoComplete="email" maxLength={254} />
        <button type="submit" className="btn btn-light">
          {t("subscribe")}
        </button>
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${idPrefix}-website`}>Website</label>
        <input id={`${idPrefix}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="note">{t.rich("consent", { link: (chunks) => <Link href="/privacy">{chunks}</Link> })}</p>
    </form>
  );
}

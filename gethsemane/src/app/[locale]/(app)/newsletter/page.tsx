import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/account/AuthCard";
import { NewsletterForm } from "@/components/NewsletterForm";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { feature } from "@/server/features";
import { subscriberByToken } from "@/server/newsletter";
import { confirmNewsletter, unsubscribeNewsletter } from "./actions";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ status?: string; confirm?: string; unsubscribe?: string }> };

const STATUSES = ["check", "confirmed", "unsubscribed", "invalid", "invalid-link", "busy", "unavailable"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "newsletter" });
  return pageMetadata({ locale, path: "/newsletter", title: t("title"), noindex: true });
}

/** Sign-up result, the confirm button (double opt-in) and the unsubscribe button. */
export default async function NewsletterPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status = "", confirm: confirmToken, unsubscribe: unsubscribeToken } = await searchParams;
  const on = feature("newsletter");
  // Unsubscribe links in sent emails keep working even after the feature is turned off.
  if (!on && !unsubscribeToken) notFound();
  const t = await getTranslations("newsletter");
  const known = (STATUSES as readonly string[]).includes(status) ? status : "";
  return (
    <AuthCard title={t("title")}>
      {known && (
        <p className={`form-message ${known.startsWith("invalid") || known === "busy" || known === "unavailable" ? "form-error" : "form-success"}`} role="status" data-testid="newsletter-status">
          {t(`status.${known}`)}
        </p>
      )}
      {confirmToken && on && (await subscriberByToken(confirmToken)) && (
        <form action={confirmNewsletter} className="stack-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={confirmToken} />
          <p>{t("confirmText")}</p>
          <button type="submit" className="btn btn-primary">
            {t("confirmButton")}
          </button>
        </form>
      )}
      {unsubscribeToken && (
        <form action={unsubscribeNewsletter} className="stack-form">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="token" value={unsubscribeToken} />
          <p>{t("unsubscribeText")}</p>
          <button type="submit" className="btn btn-secondary">
            {t("unsubscribeButton")}
          </button>
        </form>
      )}
      {on && !confirmToken && !unsubscribeToken && known !== "check" && known !== "confirmed" && <NewsletterForm idPrefix="nlp" />}
    </AuthCard>
  );
}

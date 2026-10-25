import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field } from "@/components/forms/Field";
import { contactTopics, type ContactTopic } from "@/lib/contact";
import { InfoPage, Section } from "@/components/InfoPage";
import { ADDRESS, CONTACT_EMAIL, OPENING_HOURS, SISTER_STORE, TIMEZONE_LABEL } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { MailIcon } from "@/components/Icons";
import { SocialLinks } from "@/components/SocialLinks";
import { formatOpeningDays } from "@/lib/format";
import { socialLinks } from "@/lib/social";
import { getProduct, productText } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";
import { sendContact } from "./actions";
import "@/styles/forms.css";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return pageMetadata({ locale, path: "/contact", title: t("title"), description: t("intro") });
}

export default async function ContactPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const query = await searchParams;
  const requested = query.topic;
  const initial: ContactTopic = contactTopics.includes(requested as ContactTopic) ? (requested as ContactTopic) : "sales";
  const product = typeof query.product === "string" ? getProduct(query.product) : undefined;
  const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
  const days = formatOpeningDays(locale);
  const links = socialLinks();
  return (
    <InfoPage locale={locale} path="/contact" title={t("title")} intro={t("intro")}>
      <section className="contact-form" aria-labelledby="form-title">
        <h2 id="form-title">{t("formTitle")}</h2>
        <ActionForm action={sendContact} submitLabel={t("formSend")} successOnly testId="contact-form">
          <input type="hidden" name="locale" value={locale} />
          <div className="field">
            <label htmlFor="f-topic">{t("topicLabel")}</label>
            <select id="f-topic" name="topic" defaultValue={initial}>
              {contactTopics.map((value) => (
                <option key={value} value={value}>
                  {t(`topic${cap(value)}`)}
                </option>
              ))}
            </select>
          </div>
          <Field name="name" label={t("formName")} required autoComplete="name" maxLength={100} />
          <Field name="email" label={t("formEmail")} type="email" required autoComplete="email" maxLength={254} inputMode="email" />
          <Field name="order" label={t("formOrder")} optionalText={t("formOptional")} maxLength={40} hint={t("formOrderHint")} />
          <div className="field">
            <label htmlFor="f-message">{t("formMessage")}</label>
            <textarea
              id="f-message"
              name="message"
              rows={6}
              required
              minLength={10}
              maxLength={5000}
              defaultValue={product ? t("formProductPrefill", { name: productText(product, locale).name }) : undefined}
            />
          </div>
          <div className="hp" aria-hidden="true">
            <label htmlFor="f-website">Website</label>
            <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>
          <p className="note">{t.rich("formPrivacy", { link: (chunks) => <Link href="/privacy">{chunks}</Link> })}</p>
        </ActionForm>
      </section>
      {(CONTACT_EMAIL || links.length > 0) && (
        <div className="contact-cards">
          {CONTACT_EMAIL && (
            <section className="contact-card" aria-labelledby="write-title" data-testid="contact-email-card">
              <h2 id="write-title">{t("writeTitle")}</h2>
              <p>{t("writeText")}</p>
              <a className="contact-email" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("emailSubject"))}`} data-testid="contact-email">
                <MailIcon size={20} />
                <span>{CONTACT_EMAIL}</span>
              </a>
            </section>
          )}
          {links.length > 0 && (
            <section className="contact-card" aria-labelledby="find-title" data-testid="contact-social-card">
              <h2 id="find-title">{t("findTitle")}</h2>
              <p>{t("findText")}</p>
              <SocialLinks variant="pills" links={links} />
            </section>
          )}
        </div>
      )}
      {ADDRESS && (
        <Section id="address" title={t("addressTitle")}>
          <address lang="en">{ADDRESS}</address>
          <p className="note">{t("addressNote")}</p>
        </Section>
      )}
      {days && (
        <Section id="hours" title={t("hoursTitle")}>
          <p>{t("hours", { days, open: OPENING_HOURS.open, close: OPENING_HOURS.close, timezone: TIMEZONE_LABEL[locale] })}</p>
          <p className="note">{t("hoursNote")}</p>
        </Section>
      )}
      <Section id="sister" title={t("sisterTitle")}>
        <p>
          {t.rich("sister", {
            link: (chunks) => (
              <a href={SISTER_STORE.url} rel="noopener noreferrer">
                {chunks}
              </a>
            ),
          })}
        </p>
      </Section>
    </InfoPage>
  );
}

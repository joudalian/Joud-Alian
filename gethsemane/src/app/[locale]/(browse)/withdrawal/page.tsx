import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage, Section } from "@/components/InfoPage";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { WithdrawalForm } from "@/components/WithdrawalForm";
import { CONTACT_EMAIL, POLICY_UPDATED, STORE_NAME } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { pageMetadata } from "@/lib/metadata";
import { encodeMessage } from "@/lib/whatsapp";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "withdrawal" });
  return pageMetadata({ locale, path: "/withdrawal", title: t("title"), description: t("description") });
}

// No backend: both buttons open the visitor's own app with the notice already written; nothing is sent from here.
export default async function WithdrawalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("withdrawal");
  const message = `Subject: Withdrawal from contract\n${t("message", { store: STORE_NAME })}`;
  return (
    <InfoPage locale={locale} path="/withdrawal" title={t("title")} intro={t("intro")} updated={POLICY_UPDATED}>
      <Section id="how" title={t("howTitle")}>
        <p>{t("how")}</p>
        <div className="withdrawal-actions">
          <WhatsAppLink message={message} className="btn btn-primary" testId="withdraw-whatsapp">
            {t("whatsapp")}
          </WhatsAppLink>
          {CONTACT_EMAIL && (
            <a
              className="btn btn-secondary"
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeMessage(`${STORE_NAME}: withdrawal from contract`)}&body=${encodeMessage(t("message", { store: STORE_NAME }))}`}
              data-testid="withdraw-email"
            >
              {t("email")}
            </a>
          )}
        </div>
        <p className="note">{t("fields")}</p>
      </Section>
      <Section id="form" title={t("formSectionTitle")}>
        <WithdrawalForm />
      </Section>
      <Section id="more" title={t("moreTitle")}>
        <p>{t.rich("more", { link: (chunks) => <Link href="/returns">{chunks}</Link> })}</p>
      </Section>
    </InfoPage>
  );
}

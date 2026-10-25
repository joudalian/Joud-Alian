import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage } from "@/components/InfoPage";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { faqGroups } from "@/lib/faq";
import { pageMetadata } from "@/lib/metadata";
import { faqPage } from "@/lib/structured-data";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return pageMetadata({ locale, path: "/faq", title: t("title"), description: t("intro") });
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const groups = await faqGroups(locale);
  return (
    <InfoPage locale={locale} path="/faq" title={t("faq.title")} intro={t("faq.intro")}>
      {groups.map((group) => (
        <section key={group.id} className="faq-group" aria-labelledby={`faq-${group.id}`}>
          <h2 id={`faq-${group.id}`}>{group.title}</h2>
          {/* Native disclosure widgets: keyboard operable (Enter/Space) and announced as expandable. */}
          <div className="accordion">
            {group.items.map((item) => (
              <details key={item.id} id={item.id}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
      <div className="info-actions">
        <Link href="/contact" className="btn btn-secondary">
          {t("contact.askUs")}
        </Link>
      </div>
      <JsonLd data={faqPage(groups.flatMap((g) => g.items))} />
    </InfoPage>
  );
}

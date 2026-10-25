import { getLocale, getTranslations } from "next-intl/server";
import { CONTACT_EMAIL, SISTER_STORE } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { RATES_AS_OF } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { categories, categoryText } from "@/lib/catalog";
import { feature } from "@/server/features";
import { FooterLanguages } from "./FooterLanguages";
import { NewsletterForm } from "./NewsletterForm";
import { MailIcon } from "./Icons";
import { FooterLogo } from "./Logo";
import { SocialLinks } from "./SocialLinks";


export async function Footer() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const support = [
    { href: "/how-to-order", label: t("nav.howToOrder") },
    { href: "/faq", label: t("nav.faq") },
    { href: "/shipping", label: t("nav.shipping") },
    { href: "/returns", label: t("nav.returns") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/care", label: t("nav.care") },
    { href: "/about", label: t("nav.about") },
    { href: feature("bulkOrders") ? "/bulk-orders" : "/contact?topic=wholesale", label: t("nav.wholesale") },
  ];
  const legal = [
    { href: "/privacy", label: t("nav.privacy") },
    { href: "/terms", label: t("nav.terms") },
    { href: "/withdrawal", label: t("nav.withdrawal") },
    { href: "/accessibility", label: t("nav.accessibility") },
  ];
  return (
    <footer className="site-footer dark">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="logo">
              <FooterLogo />
            </Link>
            <p>{t("footer.about")}</p>
            <p>
              {t.rich("footer.sister", {
                link: (chunks) => (
                  <a href={SISTER_STORE.url} rel="noopener noreferrer">
                    {chunks}
                  </a>
                ),
              })}
            </p>
            <SocialLinks variant="icons" testId="social-links" />
            <p className="footer-links-inline">
              <a href={SISTER_STORE.instagram} target="_blank" rel="noopener noreferrer" className="small-link">
                {t("footer.followSister")}
                <span className="sr-only"> ({t("social.newTab")})</span>
              </a>
            </p>
          </div>
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop">{t("footer.shopTitle")}</h2>
            <ul>
              <li>
                <Link href="/shop">{t("shop.all")}</Link>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/shop/${c.slug}`}>{categoryText(c, locale).name}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-support">
            <h2 id="footer-support">{t("footer.supportTitle")}</h2>
            <ul>
              {support.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
              {CONTACT_EMAIL && (
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="footer-email" data-testid="footer-email">
                    <MailIcon size={16} />
                    {/* A long address may wrap at the "@", never in the middle of a word. */}
                    <span>
                      {CONTACT_EMAIL.split("@")[0]}
                      <wbr />@{CONTACT_EMAIL.split("@")[1]}
                    </span>
                  </a>
                </li>
              )}
            </ul>
          </nav>
          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal">{t("footer.legalTitle")}</h2>
            <ul>
              {legal.map((item) => (
                <li key={item.label}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <FooterLanguages title={t("footer.languageTitle")} />
        </div>
        {feature("newsletter") && (
          <section className="footer-newsletter" aria-labelledby="footer-newsletter-title">
            <h2 id="footer-newsletter-title">{t("newsletter.title")}</h2>
            <NewsletterForm />
          </section>
        )}
        <div className="footer-bottom">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <p>{t("currency.note", { date: formatDate(RATES_AS_OF, locale) })}</p>
        </div>
      </div>
    </footer>
  );
}

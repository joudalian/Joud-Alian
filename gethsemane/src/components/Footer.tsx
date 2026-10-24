import { getLocale, getTranslations } from "next-intl/server";
import { SISTER_STORE, SOCIAL, STORE_NAME } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { RATES_AS_OF } from "@/lib/currency";
import { formatDate } from "@/lib/format";
import { categories, categoryText } from "@/lib/catalog";
import { whatsappUrl } from "@/lib/whatsapp";
import { FooterLanguages } from "./FooterLanguages";
import { ChatIcon, FacebookIcon, InstagramIcon, TikTokIcon } from "./Icons";
import { FooterLogo } from "./Logo";

const socialIcons = { instagram: InstagramIcon, facebook: FacebookIcon, tiktok: TikTokIcon } as const;
const socialNames = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" } as const;

export async function Footer() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const social = (Object.keys(SOCIAL) as (keyof typeof SOCIAL)[]).filter((k) => SOCIAL[k]);
  const support = [
    { href: "/how-to-order", label: t("nav.howToOrder") },
    { href: "/faq", label: t("nav.faq") },
    { href: "/shipping", label: t("nav.shipping") },
    { href: "/returns", label: t("nav.returns") },
    { href: "/contact", label: t("nav.contact") },
    { href: "/care", label: t("nav.care") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact?topic=wholesale", label: t("nav.wholesale") },
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
            {social.length > 0 && (
              <ul className="social-list" data-testid="social-links">
                {social.map((key) => {
                  const Icon = socialIcons[key];
                  return (
                    <li key={key}>
                      <a
                        href={SOCIAL[key]}
                        className="icon-btn"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("footer.social", { network: socialNames[key] })}
                      >
                        <Icon />
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="footer-links-inline">
              <a href={whatsappUrl(t("whatsapp.general", { store: STORE_NAME }))} target="_blank" rel="noopener noreferrer">
                <ChatIcon size={18} />
                {t("whatsapp.chatFooter")}
                <span className="sr-only"> ({t("whatsapp.newTab")})</span>
              </a>
              <a href={SISTER_STORE.instagram} target="_blank" rel="noopener noreferrer" className="small-link">
                {t("footer.followSister")}
                <span className="sr-only"> ({t("whatsapp.newTab")})</span>
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
        <div className="footer-bottom">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <p>{t("currency.note", { date: formatDate(RATES_AS_OF, locale) })}</p>
        </div>
      </div>
    </footer>
  );
}

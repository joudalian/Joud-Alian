import { getTranslations } from "next-intl/server";
import { SISTER_STORE_URL } from "@/config/store";
import { Link } from "@/i18n/navigation";
import { categorySlugs } from "@/lib/catalog";
import { FooterLanguages } from "./FooterLanguages";
import { FooterLogo } from "./Logo";

export async function Footer() {
  const t = await getTranslations();
  return (
    <footer className="site-footer dark">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="logo">
              <FooterLogo />
            </Link>
            <p>{t("footer.about")}</p>
            <p>
              {t.rich("footer.sister", {
                link: (chunks) => (
                  <a href={SISTER_STORE_URL} rel="noopener noreferrer">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop">{t("footer.shopTitle")}</h2>
            <ul>
              <li>
                <Link href="/shop">{t("shop.all")}</Link>
              </li>
              {categorySlugs.map((slug) => (
                <li key={slug}>
                  <Link href={`/shop/${slug}`}>{t(`categories.${slug}.name`)}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-info">
            <h2 id="footer-info">{t("footer.infoTitle")}</h2>
            <ul>
              <li>
                <Link href="/about">{t("nav.about")}</Link>
              </li>
              <li>
                <Link href="/wishlist">{t("nav.wishlist")}</Link>
              </li>
              <li>
                <Link href="/cart">{t("nav.cart")}</Link>
              </li>
            </ul>
          </nav>
          <FooterLanguages title={t("footer.languageTitle")} />
        </div>
        <div className="footer-bottom">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <p>{t("currency.note")}</p>
        </div>
      </div>
    </footer>
  );
}

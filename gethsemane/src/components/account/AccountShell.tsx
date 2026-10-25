import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { logOut } from "@/app/[locale]/(account)/actions";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";

const SECTIONS = [
  { href: "/account", key: "dashboard" },
  { href: "/account/orders", key: "orders" },
  { href: "/account/addresses", key: "addresses" },
  { href: "/account/profile", key: "profile" },
] as const;

/** "My account" layout: section navigation (like a WooCommerce account area) and the page content. */
export async function AccountShell({ locale, current, title, children }: { locale: Locale; current: string; title: string; children: ReactNode }) {
  const t = await getTranslations({ locale, namespace: "account" });
  return (
    <div className="container page account-page">
      <h1>{title}</h1>
      <div className="account-layout">
        <nav className="account-nav" aria-label={t("navLabel")}>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.href}>
                <Link href={s.href} aria-current={current === s.href ? "page" : undefined}>
                  {t(`nav.${s.key}`)}
                </Link>
              </li>
            ))}
            <li>
              <form action={logOut}>
                <input type="hidden" name="locale" value={locale} />
                <button type="submit" className="link-btn" data-testid="logout">
                  {t("nav.logout")}
                </button>
              </form>
            </li>
          </ul>
        </nav>
        <div className="account-content">{children}</div>
      </div>
    </div>
  );
}

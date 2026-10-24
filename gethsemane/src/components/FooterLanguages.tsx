"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALE_COOKIE, localeNames, locales } from "@/i18n/locales";
import { STORAGE_KEYS, setCookie, writeStorage } from "@/lib/storage";

/** Always-visible alternative to the floating language button. */
export function FooterLanguages({ title }: { title: string }) {
  const current = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-labelledby="footer-lang">
      <h2 id="footer-lang">{title}</h2>
      <ul className="footer-langs">
        {locales.map((locale) => (
          <li key={locale}>
            <Link
              href={pathname}
              locale={locale}
              scroll={false}
              lang={locale}
              hrefLang={locale}
              aria-current={locale === current ? "true" : undefined}
              onClick={() => {
                setCookie(LOCALE_COOKIE, locale);
                writeStorage(STORAGE_KEYS.language, locale);
              }}
            >
              {localeNames[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

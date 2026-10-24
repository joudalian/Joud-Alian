import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { localizedUrl } from "@/lib/site";
import { breadcrumbList } from "@/lib/structured-data";
import { JsonLd } from "./JsonLd";

/** Visible breadcrumb plus BreadcrumbList JSON-LD. `currentPath` is the locale-less path of this page. */
export async function Breadcrumb({ items, currentPath }: { items: { href?: string; label: string }[]; currentPath: string }) {
  const t = await getTranslations("nav");
  const locale = (await getLocale()) as Locale;
  const ld = breadcrumbList(
    items.map((item, i) => ({ name: item.label, url: localizedUrl(locale, i === items.length - 1 ? currentPath : item.href === "/" ? "" : (item.href ?? currentPath)) })),
  );
  return (
    <nav className="breadcrumb" aria-label={t("breadcrumb")}>
      <ol>
        {items.map((item, i) =>
          item.href && i < items.length - 1 ? (
            <li key={item.label}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          ) : (
            <li key={item.label}>
              <span aria-current="page">{item.label}</span>
            </li>
          ),
        )}
      </ol>
      <JsonLd data={ld} />
    </nav>
  );
}

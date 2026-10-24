import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { categories, categoryText, type CategorySlug } from "@/lib/catalog";

export async function CategoryChips({ active }: { active?: CategorySlug }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  return (
    <nav aria-label={t("shop.filterLabel")}>
      <ul className="chips">
        <li>
          <Link href="/shop" aria-current={active ? undefined : "page"}>
            {t("shop.all")}
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.slug}>
            <Link href={`/shop/${c.slug}`} aria-current={active === c.slug ? "page" : undefined}>
              {categoryText(c, locale).name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { categorySlugs, type CategorySlug } from "@/lib/catalog";

export async function CategoryChips({ active }: { active?: CategorySlug }) {
  const t = await getTranslations();
  return (
    <nav aria-label={t("shop.filterLabel")}>
      <ul className="chips">
        <li>
          <Link href="/shop" aria-current={active ? undefined : "page"}>
            {t("shop.all")}
          </Link>
        </li>
        {categorySlugs.map((slug) => (
          <li key={slug}>
            <Link href={`/shop/${slug}`} aria-current={active === slug ? "page" : undefined}>
              {t(`categories.${slug}.name`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductGrid } from "@/components/ProductCard";
import type { Locale } from "@/i18n/locales";
import { isCategorySlug, productsInCategory } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isCategorySlug(category)) return {};
  const t = await getTranslations({ locale, namespace: "categories" });
  return pageMetadata({
    locale,
    path: `/shop/${category}`,
    title: t(`${category}.name`),
    description: t(`${category}.description`),
  });
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  if (!isCategorySlug(category)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const items = productsInCategory(category);
  return (
    <div className="container page">
      <Breadcrumb
        items={[
          { href: "/", label: t("nav.home") },
          { href: "/shop", label: t("shop.title") },
          { label: t(`categories.${category}.name`) },
        ]}
      />
      <h1>{t(`categories.${category}.name`)}</h1>
      <p className="lead">{t(`categories.${category}.description`)}</p>
      <CategoryChips active={category} />
      <p className="result-count">{t("shop.count", { count: items.length })}</p>
      {items.length > 0 ? <ProductGrid products={items} headingLevel={2} /> : <p>{t("shop.empty")}</p>}
    </div>
  );
}

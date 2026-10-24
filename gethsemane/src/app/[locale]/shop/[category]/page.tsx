import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductGrid } from "@/components/ProductCard";
import { CATALOG_READY } from "@/config/store";
import { isLocale, type Locale } from "@/i18n/locales";
import { categoryText, getCategory, isCategorySlug, productsInCategory } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isCategorySlug(category) || !isLocale(locale)) notFound();
  const text = categoryText(getCategory(category)!, locale);
  return pageMetadata({
    locale,
    path: `/shop/${category}`,
    title: text.name,
    description: text.description,
    noindex: !CATALOG_READY,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  if (!isCategorySlug(category)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const items = productsInCategory(category);
  const text = categoryText(getCategory(category)!, locale);
  const lang = text.lang === locale ? undefined : text.lang;
  return (
    <div className="container page">
      <Breadcrumb
        currentPath={`/shop/${category}`}
        items={[
          { href: "/", label: t("nav.home") },
          { href: "/shop", label: t("shop.title") },
          { label: text.name },
        ]}
      />
      <h1 lang={lang}>{text.name}</h1>
      <p className="lead" lang={lang}>
        {text.description}
      </p>
      <CategoryChips active={category} />
      <p className="result-count">{t("shop.count", { count: items.length })}</p>
      {items.length > 0 ? <ProductGrid products={items} headingLevel={2} /> : <p>{t("shop.empty")}</p>}
    </div>
  );
}

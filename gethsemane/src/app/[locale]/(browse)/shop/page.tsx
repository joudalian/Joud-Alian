import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductGrid } from "@/components/ProductCard";
import type { Locale } from "@/i18n/locales";
import { products } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });
  return pageMetadata({ locale, path: "/shop", title: t("title"), description: t("intro") });
}

export default async function ShopPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="container page">
      <Breadcrumb items={[{ href: "/", label: t("nav.home") }, { label: t("shop.title") }]} />
      <h1>{t("shop.title")}</h1>
      <p className="lead">{t("shop.intro")}</p>
      <CategoryChips />
      <p className="result-count">{t("shop.count", { count: products.length })}</p>
      <ProductGrid products={products} headingLevel={2} />
    </div>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ProductGrid } from "@/components/ProductCard";
import { CATALOG_READY } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { christmasProducts } from "@/lib/christmas";
import { formatDate } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { feature } from "@/server/features";
import { christmasOrderByDate } from "@/server/settings";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "christmas" });
  return pageMetadata({ locale, path: "/christmas", title: t("title"), description: t("intro"), noindex: !CATALOG_READY });
}

/** The Christmas collection: pieces tagged "christmas". 404 while the feature is off or nothing is tagged. */
export default async function ChristmasPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const list = christmasProducts();
  if (!feature("christmas") || list.length === 0) notFound();
  const t = await getTranslations();
  const orderBy = christmasOrderByDate();
  return (
    <div className="container page">
      <Breadcrumb currentPath="/christmas" items={[{ href: "/", label: t("nav.home") }, { href: "/shop", label: t("shop.title") }, { label: t("christmas.title") }]} />
      <h1>{t("christmas.title")}</h1>
      <p className="lead">{t("christmas.intro")}</p>
      {orderBy && (
        <p className="notice-inline" data-testid="christmas-order-by">
          {t("christmas.orderBy", { date: formatDate(orderBy, locale) })}
        </p>
      )}
      <p className="result-count">{t("shop.count", { count: list.length })}</p>
      <ProductGrid products={list} headingLevel={2} />
    </div>
  );
}

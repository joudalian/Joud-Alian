import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductGrid } from "@/components/ProductCard";
import { ContentImage } from "@/components/ContentImage";
import { CATALOG_READY } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { categories, categoryText, products } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";
import { AVAILABILITY, filterProducts, isFiltered, parseShopQuery, SIZES } from "@/lib/shop-filter";
import { feature } from "@/server/features";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });
  // Filtered and searched URLs are never indexed; their canonical is the plain shop page.
  const filtered = feature("shopSearch") && isFiltered(parseShopQuery(await searchParams));
  return pageMetadata({ locale, path: "/shop", title: t("title"), description: t("intro"), noindex: !CATALOG_READY || filtered, canonical: filtered });
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const search = feature("shopSearch");
  const query = parseShopQuery(search ? await searchParams : {});
  const list = search ? filterProducts(products, query, locale) : [...products];
  const filtered = isFiltered(query);
  return (
    <>
      <div className="container page">
        <Breadcrumb currentPath="/shop" items={[{ href: "/", label: t("nav.home") }, { label: t("shop.title") }]} />
        <h1>{t("shop.title")}</h1>
        <p className="lead">{t("shop.intro")}</p>
        <CategoryChips />
        {search && (
          <form className="shop-filters" method="get" role="search" aria-label={t("shop.searchLabel")} data-testid="shop-filters">
            <div className="field shop-filter-q">
              <label htmlFor="f-q">{t("shop.searchLabel")}</label>
              <input id="f-q" name="q" type="search" defaultValue={query.q} maxLength={80} />
            </div>
            <div className="field">
              <label htmlFor="f-category">{t("shop.filterCategory")}</label>
              <select id="f-category" name="category" defaultValue={query.category}>
                <option value="">{t("shop.all")}</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {categoryText(c, locale).name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-min">{t("shop.filterMin")}</label>
              <input id="f-min" name="min" type="number" inputMode="numeric" min={0} step={1} defaultValue={query.min ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="f-max">{t("shop.filterMax")}</label>
              <input id="f-max" name="max" type="number" inputMode="numeric" min={0} step={1} defaultValue={query.max ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="f-size">{t("shop.filterSize")}</label>
              <select id="f-size" name="size" defaultValue={query.size}>
                <option value="">{t("shop.anySize")}</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {t(`shop.size.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-availability">{t("shop.filterAvailability")}</label>
              <select id="f-availability" name="availability" defaultValue={query.availability}>
                <option value="">{t("shop.anyAvailability")}</option>
                {AVAILABILITY.map((a) => (
                  <option key={a} value={a}>
                    {t(`shop.availability.${a}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="shop-filter-actions">
              <button type="submit" className="btn btn-primary">
                {t("shop.filterApply")}
              </button>
              {filtered && (
                <Link href="/shop" className="text-link">
                  {t("shop.filterReset")}
                </Link>
              )}
            </div>
          </form>
        )}
        <p className="result-count" role={filtered ? "status" : undefined} data-testid="result-count">
          {t("shop.count", { count: list.length })}
        </p>
        {list.length > 0 ? <ProductGrid products={list} headingLevel={2} /> : <p data-testid="no-results">{t("shop.noResults")}</p>}
      </div>
      <section className="image-band dark" aria-labelledby="band-title" data-testid="cross-band">
        {/* Illustrative, AI-generated background; the open space on the right carries the text. */}
        <ContentImage name="cross-olive-branch" alt={t("imagery.crossAlt")} sizes="100vw" className="band-bg" />
        <div className="container band-inner">
          <div className="band-content">
            <h2 id="band-title">{t("shop.bandTitle")}</h2>
            <p>{t("shop.bandText")}</p>
            <Link href="/contact?topic=sales" className="btn btn-light">
              {t("contact.askUs")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

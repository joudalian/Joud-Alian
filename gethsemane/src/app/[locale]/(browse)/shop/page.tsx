import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductGrid } from "@/components/ProductCard";
import { ContentImage } from "@/components/ContentImage";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { CATALOG_READY, STORE_NAME } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { products } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });
  return pageMetadata({ locale, path: "/shop", title: t("title"), description: t("intro"), noindex: !CATALOG_READY });
}

export default async function ShopPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <>
      <div className="container page">
        <Breadcrumb currentPath="/shop" items={[{ href: "/", label: t("nav.home") }, { label: t("shop.title") }]} />
        <h1>{t("shop.title")}</h1>
        <p className="lead">{t("shop.intro")}</p>
        <CategoryChips />
        <p className="result-count">{t("shop.count", { count: products.length })}</p>
        <ProductGrid products={products} headingLevel={2} />
      </div>
      <section className="image-band dark" aria-labelledby="band-title" data-testid="cross-band">
        {/* Illustrative, AI-generated background; the open space on the right carries the text. */}
        <ContentImage name="cross-olive-branch" alt={t("imagery.crossAlt")} sizes="100vw" className="band-bg" />
        <div className="container band-inner">
          <div className="band-content">
            <h2 id="band-title">{t("shop.bandTitle")}</h2>
            <p>{t("shop.bandText")}</p>
            <WhatsAppLink message={t("whatsapp.general", { store: STORE_NAME })} className="btn btn-light">
              {t("whatsapp.chat")}
            </WhatsAppLink>
          </div>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { preload } from "react-dom";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JsonLd } from "@/components/JsonLd";
import { ProductGrid } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductPurchase } from "@/components/ProductPurchase";
import { ProductReviews } from "@/components/ProductReviews";
import {
  CATALOG_READY,
  DELIVERY_BY_REGION,
  DELIVERY_TIME,
  EU_RESPONSIBLE_PERSON,
  MANUFACTURER_ADDRESS,
  MANUFACTURER_EMAIL,
  MANUFACTURER_NAME,
  PROCESSING_TIME,
  RETURN_DAYS,
} from "@/config/store";
import { Link } from "@/i18n/navigation";
import { isLocale, type Locale } from "@/i18n/locales";
import { categoryText, getProduct, imageAlt, mainCategory, mainImage, productText, productsInCategory, relatedProducts, type Product } from "@/lib/catalog";
import { RATES_AS_OF } from "@/lib/currency";
import { cmToIn, formatDate, gToOz } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { purchaseProduct } from "@/lib/order-lookup";
import { features } from "@/server/features";
import { productReviews } from "@/server/reviews";
import { checkoutBlock } from "@/server/payments";
import { OG_SIZE, PRODUCT_IMAGE_SIZES, productImageSrcSet, productOgImage } from "@/lib/product-image";
import { productLd } from "@/lib/structured-data";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProduct(slug);
  if (!product || !isLocale(locale)) notFound();
  const { name, summary, description } = productText(product, locale);
  // Placeholder products stay out of search engines until the catalog is ready (see CATALOG_READY).
  return pageMetadata({
    locale,
    path: `/product/${slug}`,
    title: name,
    description: summary ?? description,
    noindex: !CATALOG_READY,
    // og:type "product" is rendered by the page itself (Next.js metadata has no product type).
    ogType: null,
    image: { url: productOgImage(mainImage(product).file), ...OG_SIZE, alt: name },
  });
}

/** Only the details that exist in the product data are shown. */
async function Specs({ product }: { product: Product }) {
  const t = await getTranslations("product");
  const rows: [string, string][] = [];
  if (product.sizeCm) {
    const [w, h, d] = product.sizeCm;
    rows.push([t("size"), t("sizeValue", { w, h, d, wi: cmToIn(w), hi: cmToIn(h), di: cmToIn(d) })]);
  }
  if (product.weightG) rows.push([t("weight"), t("weightValue", { g: product.weightG, oz: gToOz(product.weightG) })]);
  if (product.wood) rows.push([t("wood"), t(`woodValue.${product.wood}`)]);
  if (product.finish) rows.push([t("finish"), t(`finishValue.${product.finish}`)]);
  if (product.packaging) rows.push([t("packaging"), t(`packagingValue.${product.packaging}`)]);
  if (product.giftNote) rows.push([t("giftNote"), t("giftNoteAvailable")]);
  if (rows.length === 0) return null;
  return (
    <>
      <h2>{t("specsTitle")}</h2>
      <dl className="specs" data-testid="specs">
        {rows.map(([label, value]) => (
          <div key={label} className="spec-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const text = productText(product, locale);
  const { name, summary, description } = text;
  const lang = text.lang === locale ? undefined : text.lang;
  const category = mainCategory(product);
  const flags = features();
  const set = flags.completeTheSet ? relatedProducts(product) : [];
  const reviewData = flags.reviews ? await productReviews(product.slug) : null;
  // The same-category list leaves out what "Complete the set" already shows.
  const related = productsInCategory(category.slug).filter((p) => p.slug !== product.slug && !set.includes(p));
  const path = `/product/${product.slug}`;
  const first = mainImage(product);
  const avifSrcSet = productImageSrcSet(first.file, "avif");
  preload(avifSrcSet.split(" ")[0]!, { as: "image", type: "image/avif", imageSrcSet: avifSrcSet, imageSizes: PRODUCT_IMAGE_SIZES, fetchPriority: "high" });
  // Only what the gallery draws goes to the browser (not the alt texts of every language).
  const gallery = product.images.map((image, i) => ({
    image: { file: image.file, width: image.width, height: image.height },
    alt: imageAlt(image, locale) ?? (i === 0 ? t("product.photoAlt", { name }) : t("product.photoAltN", { name, n: i + 1 })),
  }));

  return (
    <div className="container page product-page">
      {/* Open Graph: a product page (React hoists these into <head>). */}
      <meta property="og:type" content="product" />
      {CATALOG_READY && <meta property="product:price:amount" content={product.priceUsd.toFixed(2)} />}
      {CATALOG_READY && <meta property="product:price:currency" content="USD" />}
      <Breadcrumb
        currentPath={path}
        items={[
          { href: "/", label: t("nav.home") },
          { href: "/shop", label: t("shop.title") },
          { href: `/shop/${category.slug}`, label: categoryText(category, locale).name },
          { label: name },
        ]}
      />
      <div className="product-detail">
        <div className="media">
          {/* The first photo is the largest paint: static pre-sized files, preloaded in <head>. */}
          <ProductGallery images={gallery} name={name} />
        </div>
        <div>
          <h1 lang={lang}>{name}</h1>
          {summary && (
            <p className="lead" lang={lang}>
              {summary}
            </p>
          )}
          <ProductPurchase product={purchaseProduct(product, locale)} checkoutOpen={!checkoutBlock()} engravingPreview={flags.engravingPreview}>
            <Link href={`/contact?product=${product.slug}`} className="text-link">
              {t("product.askAbout")}
            </Link>
            {flags.bulkOrders && (
              <Link href={`/bulk-orders?product=${product.slug}`} className="text-link" data-testid="bulk-link">
                {t("bulk.productLink")}
              </Link>
            )}
          </ProductPurchase>
          <p lang={lang}>{description}</p>
          <Specs product={product} />
          <p className="note">{t("product.handmadeNote")}</p>
          <p className="note">{t("currency.note", { date: formatDate(RATES_AS_OF, locale) })}</p>
          <div className="accordion product-accordion">
            <details>
              <summary>{t("nav.shipping")}</summary>
              <p>{t("product.shippingSummary", { min: DELIVERY_TIME.min, max: DELIVERY_TIME.max })}</p>
              <h3 className="small-heading">{t("shipping.regionsTitle")}</h3>
              <p className="note">{t("product.deliveryIntro", { min: PROCESSING_TIME.min, max: PROCESSING_TIME.max })}</p>
              <ul className="plain-list delivery-lines">
                {DELIVERY_BY_REGION.map((r) => (
                  <li key={r.region}>{t("product.deliveryRegion", { region: t(`regions.${r.region}`), min: r.min, max: r.max })}</li>
                ))}
              </ul>
              <p className="note">{t("shipping.regionsNote")}</p>
              <p>
                <Link href="/shipping">{t("product.readMore", { page: t("nav.shipping") })}</Link>
              </p>
            </details>
            <details>
              <summary>{t("nav.returns")}</summary>
              <p>{t("product.returnsSummary", { days: RETURN_DAYS })}</p>
              <p>
                <Link href="/returns">{t("product.readMore", { page: t("nav.returns") })}</Link>
              </p>
            </details>
            <details>
              <summary>{t("product.care")}</summary>
              <p>{t("product.careSummary")}</p>
              <p>
                <Link href="/care">{t("product.readMore", { page: t("nav.care") })}</Link>
              </p>
            </details>
          </div>
          {MANUFACTURER_NAME && (
            <section className="safety-info" aria-labelledby="safety-title" data-testid="product-safety">
              <h2 id="safety-title" className="small-heading">
                {t("product.safetyTitle")}
              </h2>
              <ul className="plain-list">
                <li>{t("product.safetyManufacturer", { name: MANUFACTURER_NAME })}</li>
                {MANUFACTURER_ADDRESS && <li>{t("terms.address", { address: MANUFACTURER_ADDRESS })}</li>}
                {MANUFACTURER_EMAIL && <li>{t("terms.email", { email: MANUFACTURER_EMAIL })}</li>}
                {EU_RESPONSIBLE_PERSON && <li>{t("product.safetyEu", { name: EU_RESPONSIBLE_PERSON })}</li>}
              </ul>
            </section>
          )}
        </div>
      </div>
      {reviewData ? (
        <ProductReviews data={reviewData} locale={locale} />
      ) : (
        <section className="reviews-note" aria-labelledby="reviews-title">
          <h2 id="reviews-title">{t("product.reviewsTitle")}</h2>
          <p>{flags.reviews ? t("product.reviewsComing") : t("product.reviewsText")}</p>
        </section>
      )}
      {set.length > 0 && (
        <section className="section" aria-labelledby="set-title" data-testid="complete-the-set">
          <h2 id="set-title">{t("product.completeTheSet")}</h2>
          <ProductGrid products={set} />
        </section>
      )}
      {related.length > 0 && (
        <section className="section" aria-labelledby="related-title">
          <h2 id="related-title">{t("product.related")}</h2>
          <ProductGrid products={related} />
        </section>
      )}
      <JsonLd data={productLd(product, locale, reviewData)} />
    </div>
  );
}

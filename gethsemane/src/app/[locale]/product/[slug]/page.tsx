import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { preload } from "react-dom";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JsonLd } from "@/components/JsonLd";
import { Price } from "@/components/Price";
import { AddToCartButton, WishlistButton } from "@/components/ProductActions";
import { ProductGrid } from "@/components/ProductCard";
import { ProductOrderBar } from "@/components/ProductOrderBar";
import { WhatsAppLink } from "@/components/WhatsAppLink";
import { WhatsAppOrderButton } from "@/components/WhatsAppOrder";
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
  STORE_NAME,
} from "@/config/store";
import { Link } from "@/i18n/navigation";
import { isLocale, type Locale } from "@/i18n/locales";
import { getProduct, productText, productsInCategory, type Product, type ProductSlug } from "@/lib/catalog";
import { RATES_AS_OF } from "@/lib/currency";
import { cmToIn, formatDate, gToOz } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { PRODUCT_IMAGE_SIZES, productImageSrcSet } from "@/lib/product-image";
import { productLd } from "@/lib/structured-data";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProduct(slug);
  if (!product || !isLocale(locale)) notFound();
  const { name, description } = productText(product, locale);
  // Placeholder products stay out of search engines until the catalog is ready (see CATALOG_READY).
  return pageMetadata({ locale, path: `/product/${slug}`, title: name, description, noindex: !CATALOG_READY });
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
  const productSlug = product.slug as ProductSlug;
  const { name, description } = productText(product, locale);
  const related = productsInCategory(product.category).filter((p) => p.slug !== product.slug);
  const path = `/product/${product.slug}`;
  const avifSrcSet = productImageSrcSet(product.image, "avif");
  preload(avifSrcSet.split(" ")[0]!, { as: "image", type: "image/avif", imageSrcSet: avifSrcSet, imageSizes: PRODUCT_IMAGE_SIZES, fetchPriority: "high" });

  return (
    <div className="container page product-page">
      <Breadcrumb
        currentPath={path}
        items={[
          { href: "/", label: t("nav.home") },
          { href: "/shop", label: t("shop.title") },
          { href: `/shop/${product.category}`, label: t(`categories.${product.category}.name`) },
          { label: name },
        ]}
      />
      <div className="product-detail">
        <div className="media">
          {/* The largest paint of the page: static pre-sized files (scripts/size-product-images.mjs), preloaded
              in <head>, so it never waits for the on-demand image optimizer. */}
          <picture>
            <source type="image/avif" srcSet={avifSrcSet} sizes={PRODUCT_IMAGE_SIZES} />
            <img
              src={productImageSrcSet(product.image, "webp").split(" ")[0]}
              srcSet={productImageSrcSet(product.image, "webp")}
              sizes={PRODUCT_IMAGE_SIZES}
              alt={t("product.photoAlt", { name })}
              width={800}
              height={1000}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>
        <div>
          <h1>{name}</h1>
          <p className="product-price">
            <Price usd={product.priceUsd} />
          </p>
          <p>{description}</p>
          <div className="buy-row">
            <AddToCartButton slug={productSlug} name={name} viewLink />
            <WishlistButton slug={productSlug} name={name} />
          </div>
          <div className="order-row" id="order-row">
            <WhatsAppOrderButton lines={[{ slug: productSlug, qty: 1 }]} label={t("product.orderOnlyThis")} className="btn btn-whatsapp btn-block" />
            <p className="note">{t("cart.whatsappHint")}</p>
            <WhatsAppLink message={t("whatsapp.ask", { store: STORE_NAME, name })} className="text-link">
              {t("product.askAbout")}
            </WhatsAppLink>
          </div>
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
      <section className="reviews-note" aria-labelledby="reviews-title">
        <h2 id="reviews-title">{t("product.reviewsTitle")}</h2>
        <p>{t("product.reviewsText")}</p>
      </section>
      {related.length > 0 && (
        <section className="section" aria-labelledby="related-title">
          <h2 id="related-title">{t("product.related")}</h2>
          <ProductGrid products={related} />
        </section>
      )}
      <ProductOrderBar slug={productSlug} name={name} priceUsd={product.priceUsd} />
      <JsonLd data={productLd(product, locale)} />
    </div>
  );
}

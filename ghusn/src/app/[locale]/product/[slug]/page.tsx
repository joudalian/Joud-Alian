import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Price } from "@/components/Price";
import { AddToCartButton, WishlistButton } from "@/components/ProductActions";
import { ProductGrid } from "@/components/ProductCard";
import { WhatsAppOrderButton } from "@/components/WhatsAppOrder";
import type { Locale } from "@/i18n/locales";
import { getProduct, productText, productsInCategory, type ProductSlug } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const { name, description } = productText(product, locale);
  return pageMetadata({ locale, path: `/product/${slug}`, title: name, description });
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

  return (
    <div className="container page">
      <Breadcrumb
        items={[
          { href: "/", label: t("nav.home") },
          { href: "/shop", label: t("shop.title") },
          { href: `/shop/${product.category}`, label: t(`categories.${product.category}.name`) },
          { label: name },
        ]}
      />
      <div className="product-detail">
        <div className="media">
          <Image src={product.image} alt={name} width={800} height={1000} preload sizes="(min-width: 1280px) 576px, (min-width: 768px) 48vw, 100vw" />
        </div>
        <div>
          <h1>{name}</h1>
          <p className="product-price">
            <Price usd={product.priceUsd} />
          </p>
          <p>{description}</p>
          <div className="buy-row">
            <AddToCartButton slug={productSlug} />
            <WishlistButton slug={productSlug} />
          </div>
          <div className="order-row">
            <WhatsAppOrderButton lines={[{ slug: productSlug, qty: 1 }]} className="btn btn-whatsapp btn-block" />
            <p className="note">{t("cart.whatsappHint")}</p>
          </div>
          <h2>{t("product.details")}</h2>
          <dl className="specs">
            <dt>{t("product.material")}</dt>
            <dd>{t("product.materialValue")}</dd>
            <dt>{t("product.care")}</dt>
            <dd>{t("product.careText")}</dd>
          </dl>
          <p className="note">{t("product.handmadeNote")}</p>
          <p className="note">{t("currency.note")}</p>
        </div>
      </div>
      {related.length > 0 && (
        <section className="section" aria-labelledby="related-title">
          <h2 id="related-title">{t("product.related")}</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

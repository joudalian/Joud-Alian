import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { fromPriceUsd, hasPriceRange, mainImage, productText, type Product } from "@/lib/catalog";
import { CARD_IMAGE_SIZES } from "@/lib/product-image";
import { PriceTag } from "./Price";
import { AddToCartButton, WishlistToggle } from "./ProductActions";
import { ProductPicture } from "./ProductPicture";

/** The heading link names the piece, so the photo is decorative here (alt=""). */
export async function ProductCard({ product, headingLevel = 3 }: { product: Product; headingLevel?: 2 | 3 }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("product");
  const text = productText(product, locale);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const range = hasPriceRange(product);
  return (
    <article className="product-card">
      <div className="media">
        <ProductPicture image={mainImage(product)} alt="" sizes={CARD_IMAGE_SIZES} />
        {product.availability === "sold_out" && <span className="tag tag-sold_out card-tag">{t("availability.sold_out")}</span>}
        <WishlistToggle slug={product.slug} name={text.name} />
      </div>
      <div className="body">
        <Heading>
          <Link href={`/product/${product.slug}`} lang={text.lang === locale ? undefined : text.lang}>
            {text.name}
          </Link>
        </Heading>
        <PriceTag usd={fromPriceUsd(product)} compareAtUsd={range ? undefined : product.compareAtUsd} from={range} />
        <div className="actions">
          {product.variants.length > 0 ? (
            // Sizes are chosen on the product page.
            <Link href={`/product/${product.slug}`} className="btn btn-primary btn-block" aria-label={`${t("chooseOptions")}: ${text.name}`}>
              {t("chooseOptions")}
            </Link>
          ) : product.availability === "sold_out" ? (
            <Link href={`/product/${product.slug}`} className="btn btn-secondary btn-block" aria-label={`${t("viewPiece")}: ${text.name}`}>
              {t("viewPiece")}
            </Link>
          ) : (
            <AddToCartButton slug={product.slug} name={text.name} />
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ products, headingLevel }: { products: readonly Product[]; headingLevel?: 2 | 3 }) {
  return (
    <ul className="product-grid">
      {products.map((product) => (
        <li key={product.slug}>
          <ProductCard product={product} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}

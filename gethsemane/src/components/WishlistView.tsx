"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { fromPriceUsd, getProduct, hasPriceRange, mainImage, productText } from "@/lib/catalog";
import { useCart, useHydrated, useWishlist } from "@/lib/client-store";
import { HeartIcon } from "./Icons";
import { announce } from "./LiveRegion";
import { PriceTag } from "./Price";
import { ProductPicture } from "./ProductPicture";

export function WishlistView() {
  const t = useTranslations("wishlist");
  const tCart = useTranslations("cart");
  const tProduct = useTranslations("product");
  const locale = useLocale() as Locale;
  const hydrated = useHydrated();
  const { items, remove } = useWishlist();
  const { add } = useCart();

  if (!hydrated) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        {t("loading")}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <HeartIcon size={48} />
        <h2>{t("empty")}</h2>
        <p>{t("emptyText")}</p>
        <Link href="/shop" className="btn btn-primary">
          {t("browse")}
        </Link>
      </div>
    );
  }

  return (
    <ul className="line-list">
      {items.map((slug) => {
        const product = getProduct(slug);
        if (!product) return null;
        const text = productText(product, locale);
        const name = text.name;
        // Pieces with sizes or engraving are chosen on the product page; sold-out pieces cannot be ordered.
        const needsChoice = product.variants.length > 0;
        const from = fromPriceUsd(product);
        return (
          <li key={slug} className="line">
            <ProductPicture image={mainImage(product)} alt="" sizes="88px" className="line-thumb" />
            <div>
              <h2>
                <Link href={`/product/${slug}`} lang={text.lang === locale ? undefined : text.lang}>
                  {name}
                </Link>
              </h2>
              <PriceTag usd={from} compareAtUsd={hasPriceRange(product) ? undefined : product.compareAtUsd} from={hasPriceRange(product)} />
              <div className="line-controls">
                {needsChoice ? (
                  <Link href={`/product/${slug}`} className="btn btn-primary">
                    {tProduct("chooseOptions")}
                  </Link>
                ) : product.availability === "sold_out" ? (
                  <span className="tag tag-sold_out">{tProduct("availability.sold_out")}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      add(slug);
                      remove(slug);
                      announce(tCart("added", { name }));
                    }}
                  >
                    {t("moveToCart")}
                  </button>
                )}
                <button
                  type="button"
                  className="link-btn"
                  aria-label={t("removeItem", { name })}
                  onClick={() => {
                    remove(slug);
                    announce(t("removed", { name }));
                  }}
                >
                  {t("remove")}
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

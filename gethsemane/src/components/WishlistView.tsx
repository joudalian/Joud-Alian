"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { useCart, useHydrated, useWishlist } from "@/lib/client-store";
import { fromPrice, type OrderLookup } from "@/lib/order-message";
import { HeartIcon } from "./Icons";
import { announce } from "./LiveRegion";
import { PriceTag } from "./Price";
import { ProductPicture } from "./ProductPicture";

/** `lookup` holds every product in the page language (compact, from the server). */
export function WishlistView({ lookup }: { lookup: OrderLookup }) {
  const t = useTranslations("wishlist");
  const tCart = useTranslations("cart");
  const tProduct = useTranslations("product");
  const locale = useLocale() as Locale;
  const hydrated = useHydrated();
  const { items: stored, remove } = useWishlist();
  // Pieces no longer in the shop are left out.
  const items = stored.filter((slug) => Object.hasOwn(lookup, slug));
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
        const product = lookup[slug]!;
        const name = product.name;
        // Pieces with sizes or engraving are chosen on the product page; sold-out pieces cannot be ordered.
        const needsChoice = product.variants.length > 0;
        const from = fromPrice(product);
        return (
          <li key={slug} className="line">
            <ProductPicture image={product.image} alt="" sizes="88px" className="line-thumb" />
            <div>
              <h2>
                <Link href={`/product/${slug}`} lang={product.lang === locale ? undefined : product.lang}>
                  {name}
                </Link>
              </h2>
              <PriceTag usd={from.usd} compareAtUsd={from.range ? undefined : product.compareAtUsd} from={from.range} />
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

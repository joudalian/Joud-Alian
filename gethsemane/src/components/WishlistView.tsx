"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getProduct, productImage } from "@/lib/catalog";
import { useCart, useHydrated, useWishlist } from "@/lib/client-store";
import { HeartIcon } from "./Icons";
import { Price } from "./Price";

export function WishlistView() {
  const t = useTranslations("wishlist");
  const tp = useTranslations("products");
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
        const name = tp(`${slug}.name`);
        return (
          <li key={slug} className="line">
            <Image src={productImage(slug)} alt={name} width={88} height={110} sizes="88px" />
            <div>
              <h2>
                <Link href={`/product/${slug}`}>{name}</Link>
              </h2>
              <Price usd={product.priceUsd} />
              <div className="line-controls">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    add(slug);
                    remove(slug);
                  }}
                >
                  {t("moveToCart")}
                </button>
                <button type="button" className="link-btn" aria-label={t("removeItem", { name })} onClick={() => remove(slug)}>
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

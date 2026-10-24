"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ProductSlug } from "@/lib/catalog";
import { useCart, useHydrated, useWishlist } from "@/lib/client-store";
import { CartIcon, CheckIcon, HeartIcon } from "./Icons";

export function AddToCartButton({ slug, className = "btn btn-primary btn-block" }: { slug: ProductSlug; className?: string }) {
  const t = useTranslations("product");
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          add(slug);
          setAdded(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setAdded(false), 2000);
        }}
      >
        {added ? <CheckIcon size={18} /> : <CartIcon size={18} />}
        {added ? t("addedToCart") : t("addToCart")}
      </button>
      <span className="sr-only" role="status">
        {added ? t("addedToCart") : ""}
      </span>
    </>
  );
}

/** Heart toggle used on product cards (icon only). */
export function WishlistToggle({ slug, name, className = "icon-btn wish" }: { slug: ProductSlug; name: string; className?: string }) {
  const t = useTranslations("product");
  const { has, toggle } = useWishlist();
  const hydrated = useHydrated();
  const saved = hydrated && has(slug);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={saved}
      aria-label={saved ? t("removeFromWishlist", { name }) : t("addToWishlist", { name })}
      onClick={() => toggle(slug)}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

/** Labelled wishlist button for the product page. */
export function WishlistButton({ slug }: { slug: ProductSlug }) {
  const t = useTranslations("product");
  const { has, toggle } = useWishlist();
  const hydrated = useHydrated();
  const saved = hydrated && has(slug);
  return (
    <button type="button" className="btn btn-secondary wish" aria-pressed={saved} onClick={() => toggle(slug)}>
      <HeartIcon size={18} filled={saved} />
      {saved ? t("savedToWishlist") : t("saveToWishlist")}
    </button>
  );
}

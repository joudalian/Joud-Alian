"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ProductSlug } from "@/lib/catalog";
import { useCart, useHydrated, useWishlist } from "@/lib/client-store";
import { CartIcon, CheckIcon, HeartIcon } from "./Icons";
import { announce } from "./LiveRegion";

export function AddToCartButton({ slug, name, className = "btn btn-primary btn-block" }: { slug: ProductSlug; name: string; className?: string }) {
  const t = useTranslations("product");
  const tCart = useTranslations("cart");
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        add(slug);
        setAdded(true);
        announce(tCart("added", { name }));
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setAdded(false), 2000);
      }}
    >
      {added ? <CheckIcon size={18} /> : <CartIcon size={18} />}
      {added ? t("addedToCart") : t("addToCart")}
    </button>
  );
}

function useWishlistToggle(slug: ProductSlug, name: string) {
  const t = useTranslations("wishlist");
  const { has, toggle } = useWishlist();
  const hydrated = useHydrated();
  const saved = hydrated && has(slug);
  const onToggle = () => {
    toggle(slug);
    announce(saved ? t("removed", { name }) : t("added", { name }));
  };
  return { saved, onToggle };
}

/** Heart toggle used on product cards (icon only). */
export function WishlistToggle({ slug, name, className = "icon-btn wish" }: { slug: ProductSlug; name: string; className?: string }) {
  const t = useTranslations("product");
  const { saved, onToggle } = useWishlistToggle(slug, name);
  return (
    <button
      type="button"
      className={className}
      aria-pressed={saved}
      aria-label={saved ? t("removeFromWishlist", { name }) : t("addToWishlist", { name })}
      onClick={onToggle}
    >
      <HeartIcon filled={saved} />
    </button>
  );
}

/** Labelled wishlist button for the product page. */
export function WishlistButton({ slug, name }: { slug: ProductSlug; name: string }) {
  const t = useTranslations("product");
  const { saved, onToggle } = useWishlistToggle(slug, name);
  return (
    <button type="button" className="btn btn-secondary wish" aria-pressed={saved} onClick={onToggle}>
      <HeartIcon size={18} filled={saved} />
      {saved ? t("savedToWishlist") : t("saveToWishlist")}
    </button>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { ProductSlug } from "@/lib/catalog";
import { useCart, useHydrated, useWishlist } from "@/lib/client-store";
import { CartIcon, CheckIcon, HeartIcon } from "./Icons";
import { announce } from "./LiveRegion";

/**
 * "Add to order". The accessible name repeats the product ("Add to order: Olive Wood Rosary"), starting with
 * the visible text. With `viewLink`, a "View your order" link appears next to it once something was added
 * (and stays, rather than only flashing a confirmation).
 */
export function AddToCartButton({
  slug,
  name,
  className = "btn btn-primary btn-block",
  viewLink = false,
}: {
  slug: ProductSlug;
  name: string;
  className?: string;
  viewLink?: boolean;
}) {
  const t = useTranslations("product");
  const tCart = useTranslations("cart");
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [everAdded, setEverAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const label = added ? t("addedToCart") : t("addToCart");
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={`${label}: ${name}`}
        onClick={() => {
          add(slug);
          setAdded(true);
          setEverAdded(true);
          announce(tCart("added", { name }));
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setAdded(false), 2000);
        }}
      >
        {added ? <CheckIcon size={18} /> : <CartIcon size={18} />}
        {label}
      </button>
      {viewLink && everAdded && (
        <Link href="/cart" className="text-link view-order" data-testid="view-order">
          {t("viewOrder")}
          <span aria-hidden="true"> →</span>
        </Link>
      )}
    </>
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

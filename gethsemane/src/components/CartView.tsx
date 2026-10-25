"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type KeyboardEvent } from "react";
import { CONTACT_EMAIL } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { useCart, useHydrated } from "@/lib/client-store";
import { formatPrice } from "@/lib/currency";
import { linePriceUsd, lineProduct, orderVariant, unitPrice, type OrderLookup } from "@/lib/cart-lookup";
import { MAX_CART_LINES, MAX_QTY, STORAGE_KEYS, lineKey, removeStorage } from "@/lib/storage";
import { useCurrency } from "./CurrencyProvider";
import { CartIcon } from "./Icons";
import { announce } from "./LiveRegion";
import { Price } from "./Price";
import { ProductPicture } from "./ProductPicture";

const clampQty = (value: number) =>
  Math.max(1, Math.min(MAX_QTY, Math.round(value) || 1));

/**
 * Quantity field that keeps what is typed while editing (so "12" can be typed digit by digit) and commits the
 * clamped number on blur or Enter.
 */
function QtyInput({
  id,
  qty,
  onCommit,
}: {
  id: string;
  qty: number;
  onCommit: (qty: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    const next = clampQty(Number(draft));
    if (next !== qty) onCommit(next);
  };
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={1}
      max={MAX_QTY}
      value={draft ?? String(qty)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}

/** Whether the checkout can take payments ("open"), or why not; decided on the server (src/server/payments.ts). */
export type CheckoutState = "open" | "test" | "closed";

/**
 * The order (cart): lines with quantities, prices and removal, and the way on to checkout. `lookup` holds every
 * product in the page language (compact, from the server); `firstCategory` is suggested when the order is empty.
 * Prices here are indicative: the checkout recomputes everything on the server.
 */
export function CartView({
  lookup,
  firstCategory,
  checkout,
}: {
  lookup: OrderLookup;
  firstCategory: { slug: string; name: string };
  checkout: CheckoutState;
}) {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const { currency } = useCurrency();
  const hydrated = useHydrated();
  const { lines, setQty, remove } = useCart();

  // Order details typed on the old WhatsApp order page are no longer used: forget them in this browser.
  useEffect(() => removeStorage(STORAGE_KEYS.orderDetails), []);

  if (!hydrated) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        {t("loading")}
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="empty-state">
        <CartIcon size={48} />
        <h2>{t("empty")}</h2>
        <p>
          {t.rich("emptyText", {
            category: firstCategory.name,
            link: (chunks) => <Link href={`/shop/${firstCategory.slug}`}>{chunks}</Link>,
          })}
        </p>
        <Link href="/shop" className="btn btn-primary">
          {t("shop")}
        </Link>
      </div>
    );
  }

  const totalUsd = lines.reduce((sum, l) => {
    const product = lineProduct(l, lookup);
    return sum + (product ? linePriceUsd(product, l) : 0);
  }, 0);
  const orderable = lines.some((l) => lineProduct(l, lookup));
  const atLimit = lines.length >= MAX_CART_LINES;

  const changeQty = (key: string, name: string, qty: number) => {
    const next = clampQty(qty);
    setQty(key, next);
    announce(t("quantityChanged", { name, qty: next }));
  };

  const wholesale = (
    <Link href="/contact?topic=wholesale" className="text-link">
      {t("needMore")}
    </Link>
  );

  return (
    <div className="cart-layout">
      <div className="cart-lines">
        <ul className="line-list">
          {lines.map((line, index) => {
            const key = lineKey(line);
            const product = lineProduct(line, lookup);
            if (!product) {
              // A piece (or size) that was removed from the shop since it was added: say so and offer removal.
              const known = Object.hasOwn(lookup, line.slug) ? lookup[line.slug] : undefined;
              const name = known ? known.name : line.slug.replace(/-/g, " ");
              return (
                <li
                  key={key}
                  className="line line-unavailable"
                  data-testid="line-unavailable"
                >
                  <div className="line-thumb" aria-hidden="true" />
                  <div>
                    <h2>{name}</h2>
                    <p className="note">{t("unavailable")}</p>
                    <button
                      type="button"
                      className="link-btn"
                      aria-label={t("removeItem", { name })}
                      onClick={() => {
                        remove(key);
                        announce(t("removed", { name }));
                      }}
                    >
                      {t("remove")}
                    </button>
                  </div>
                </li>
              );
            }
            const variant = orderVariant(product, line.variantId);
            const name = variant ? `${product.name}, ${variant.label}` : product.name;
            const qtyId = `qty-${line.slug}${line.variantId ? `-${line.variantId}` : ""}${line.engraving ? `-e${index}` : ""}`;
            return (
              <li key={key} className="line">
                {/* The product name next to the photo already names it. */}
                <ProductPicture
                  image={product.image}
                  alt=""
                  sizes="88px"
                  className="line-thumb"
                />
                <div>
                  <h2>
                    <Link
                      href={`/product/${line.slug}`}
                      lang={product.lang === locale ? undefined : product.lang}
                    >
                      {product.name}
                    </Link>
                  </h2>
                  {variant && (
                    <p className="line-detail">
                      {variant.label}
                    </p>
                  )}
                  {line.engraving && (
                    <p className="line-detail">
                      {t("engravingLine", { text: line.engraving })}
                    </p>
                  )}
                  {product.availability === "sold_out" && (
                    <p className="note">{t("soldOutLine")}</p>
                  )}
                  <Price
                    usd={unitPrice(product, line.variantId, Boolean(line.engraving))}
                  />
                  <div className="line-controls">
                    <div className="stepper">
                      <button
                        type="button"
                        aria-label={t("decrease", { name })}
                        disabled={line.qty <= 1}
                        onClick={() => changeQty(key, name, line.qty - 1)}
                      >
                        −
                      </button>
                      <label htmlFor={qtyId} className="sr-only">
                        {t("quantityOf", { name })}
                      </label>
                      <QtyInput
                        id={qtyId}
                        qty={line.qty}
                        onCommit={(qty) => changeQty(key, name, qty)}
                      />
                      <button
                        type="button"
                        aria-label={t("increase", { name })}
                        disabled={line.qty >= MAX_QTY}
                        onClick={() => changeQty(key, name, line.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="link-btn"
                      aria-label={t("removeItem", { name })}
                      onClick={() => {
                        remove(key);
                        announce(t("removed", { name }));
                      }}
                    >
                      {t("remove")}
                    </button>
                    <Price
                      usd={linePriceUsd(product, line)}
                      className="price line-total"
                    />
                  </div>
                  {line.qty >= MAX_QTY && (
                    <p className="note limit-note">{wholesale}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {atLimit && <p className="note limit-note">{wholesale}</p>}
      </div>

      <section className="summary" aria-labelledby="summary-title">
        <h2 id="summary-title">{t("summary")}</h2>
        <div className="summary-row">
          <span>{t("subtotalUsd")}</span>
          <span className="price subtotal-usd">{formatPrice(totalUsd, "USD", locale)}</span>
        </div>
        {currency !== "USD" && (
          <div className="summary-row summary-approx">
            <span>{t("approxTotal", { currency })}</span>
            <span className="price subtotal">≈ {formatPrice(totalUsd, currency, locale)}</span>
          </div>
        )}
        <div className="summary-row summary-shipping">
          <span>{t("shippingLabel")}</span>
          <span>{t("shippingAtCheckout")}</span>
        </div>
        <p className="note">{t("chargedInUsd")}</p>
        {checkout === "closed" ? (
          <div className="notice-inline" role="status" data-testid="payments-soon">
            <p>
              <strong>{t("paymentsSoonTitle")}</strong>
            </p>
            <p>{t("paymentsSoonText")}</p>
            <p>
              {CONTACT_EMAIL && (
                <>
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
                  {" · "}
                </>
              )}
              <Link href="/contact">{t("contactPage")}</Link>
            </p>
          </div>
        ) : orderable ? (
          <>
            <Link href="/checkout" className="btn btn-primary btn-block" data-testid="to-checkout">
              {t("toCheckout")}
            </Link>
            {checkout === "test" && <p className="note warning-note">{t("testModeNote")}</p>}
          </>
        ) : (
          <p className="note">{t("nothingToOrder")}</p>
        )}
        <Link href="/shop" className="btn btn-secondary btn-block">
          {t("continue")}
        </Link>
      </section>
    </div>
  );
}

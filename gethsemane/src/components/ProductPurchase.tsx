"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import { cmToIn, gToOz } from "@/lib/format";
import { orderVariant, unitPrice, type OrderProduct } from "@/lib/cart-lookup";
import { PriceTag } from "./Price";
import { AddToCartButton, BuyNowButton, WishlistButton } from "./ProductActions";
import { ProductOrderBar } from "./ProductOrderBar";
import { formatPrice } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

/**
 * Everything on the product page that depends on the visitor's choices: price, availability, size (variant),
 * engraving, "Add to order", "Order only this piece" and the sticky order bar on phones. `children` (the
 * server-rendered "Ask about this piece" link and hints) goes below the order button.
 */
/** The product as the server passes it: the order data plus what this block shows (sizes, weight, lead time). */
export type PurchaseProduct = OrderProduct & {
  leadTimeDays?: number;
  sizeCm?: readonly [number, number, number];
  weightG?: number;
  /** Size and weight per variant id, when the variant has its own. */
  variantSpecs: Readonly<Record<string, { sizeCm?: readonly [number, number, number]; weightG?: number }>>;
};

export function ProductPurchase({ product, checkoutOpen, children }: { product: PurchaseProduct; checkoutOpen: boolean; children?: ReactNode }) {
  const t = useTranslations("product");
  const locale = useLocale() as Locale;
  const { currency } = useCurrency();
  const { slug, name } = product;
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [engrave, setEngrave] = useState(false);
  const [engraving, setEngraving] = useState("");
  const ids = { variants: useId(), engrave: useId(), text: useId(), hint: useId(), missing: useId(), lead: useId() };

  const variant = orderVariant(product, variantId);
  const offer = product.engraving;
  const text = engrave && offer ? engraving.trim() : "";
  const engravingMissing = Boolean(engrave && offer && !text);
  const soldOut = product.availability === "sold_out";
  const unit = unitPrice(product, variantId, Boolean(text));
  const fullName = variant ? `${name}, ${variant.label}` : name;
  const specs = variantId ? product.variantSpecs[variantId] : undefined;
  const size = specs?.sizeCm ?? product.sizeCm;
  const weight = specs?.weightG ?? product.weightG;
  // A variant with its own price has no previous price to strike through.
  const compareAt = !variant || variant.priceUsd === product.priceUsd ? product.compareAtUsd : undefined;
  const chars = Array.from(engraving).length;

  return (
    <>
      <p className="product-price" data-testid="product-price">
        <PriceTag usd={unit} compareAtUsd={compareAt !== undefined && !text ? compareAt : undefined} />
      </p>
      <p className="availability">
        <span className={`tag tag-${product.availability}`} data-testid="availability">
          {t(`availability.${product.availability}`)}
        </span>
        {product.availability === "made_to_order" && product.leadTimeDays && (
          <span className="note" id={ids.lead}>
            {" "}
            {t("leadTime", { days: product.leadTimeDays })}
          </span>
        )}
      </p>

      {product.variants.length > 0 && (
        <fieldset className="chip-group variant-picker" aria-describedby={size || weight ? ids.variants : undefined}>
          <legend>{t("variantLabel")}</legend>
          {product.variants.map((v) => (
            <label key={v.id} className="chip">
              <input type="radio" name={`variant-${slug}`} value={v.id} checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
              <span>
                {v.label}
                {v.priceUsd !== product.priceUsd && <> · {formatPrice(v.priceUsd, currency, locale)}</>}
              </span>
            </label>
          ))}
          {(size || weight) && (
            <p className="note variant-specs" id={ids.variants}>
              {size && t("sizeValue", { w: size[0], h: size[1], d: size[2], wi: cmToIn(size[0]), hi: cmToIn(size[1]), di: cmToIn(size[2]) })}
              {size && weight && " · "}
              {weight && t("weightValue", { g: weight, oz: gToOz(weight) })}
            </p>
          )}
        </fieldset>
      )}

      {offer && !soldOut && (
        <div className="engraving">
          <div className="field field-check">
            <input id={ids.engrave} type="checkbox" checked={engrave} onChange={(e) => setEngrave(e.target.checked)} />
            <label htmlFor={ids.engrave}>{t("engravingAdd", { price: formatPrice(offer.extraUsd, currency, locale) })}</label>
          </div>
          {engrave && (
            <div className="field">
              <label htmlFor={ids.text}>{t("engravingText")}</label>
              <input
                id={ids.text}
                type="text"
                value={engraving}
                maxLength={offer.maxChars}
                aria-describedby={ids.hint}
                onChange={(e) => setEngraving(Array.from(e.target.value).slice(0, offer.maxChars).join(""))}
              />
              <p className="note engraving-hint" id={ids.hint}>
                <span className="engraving-count" aria-hidden="true">
                  {chars}/{offer.maxChars}
                </span>{" "}
                <span className="sr-only">{t("engravingMax", { max: offer.maxChars })} </span>
                {t("engravingNote", { price: formatPrice(offer.extraUsd, currency, locale) })}
              </p>
            </div>
          )}
        </div>
      )}

      {engravingMissing && (
        <p className="note warning-note" id={ids.missing} role="status">
          {t("engravingMissing")}
        </p>
      )}

      <div className="buy-row">
        {soldOut ? (
          <p className="note">{t("soldOutNote")}</p>
        ) : (
          <AddToCartButton
            slug={slug}
            name={fullName}
            viewLink
            options={{ variantId, engraving: text || undefined }}
            disabled={engravingMissing}
            describedBy={engravingMissing ? ids.missing : undefined}
          />
        )}
        <WishlistButton slug={slug} name={name} />
      </div>
      <div className="order-row" id="order-row">
        {checkoutOpen && !soldOut && !engravingMissing && <BuyNowButton slug={slug} name={fullName} options={{ variantId, engraving: text || undefined }} />}
        {children}
      </div>
      {!soldOut && !engravingMissing && <ProductOrderBar slug={slug} name={fullName} priceUsd={unit} options={{ variantId, engraving: text || undefined }} />}
    </>
  );
}

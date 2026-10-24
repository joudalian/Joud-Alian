"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/locales";
import { getProduct, getVariant, unitPriceUsd, variantLabel } from "@/lib/catalog";
import { cmToIn, gToOz } from "@/lib/format";
import { PriceTag } from "./Price";
import { AddToCartButton, WishlistButton } from "./ProductActions";
import { ProductOrderBar } from "./ProductOrderBar";
import { WhatsAppOrderButton } from "./WhatsAppOrder";
import { formatPrice } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

/**
 * Everything on the product page that depends on the visitor's choices: price, availability, size (variant),
 * engraving, "Add to order", "Order only this piece" and the sticky order bar on phones. `children` (the
 * server-rendered "Ask about this piece" link and hints) goes below the order button.
 */
export function ProductPurchase({ slug, name, children }: { slug: string; name: string; children?: ReactNode }) {
  const t = useTranslations("product");
  const locale = useLocale() as Locale;
  const { currency } = useCurrency();
  const product = getProduct(slug)!;
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [engrave, setEngrave] = useState(false);
  const [engraving, setEngraving] = useState("");
  const ids = { variants: useId(), engrave: useId(), text: useId(), hint: useId(), missing: useId(), lead: useId() };

  const variant = getVariant(product, variantId);
  const offer = product.engraving?.enabled ? product.engraving : undefined;
  const text = engrave && offer ? engraving.trim() : "";
  const engravingMissing = Boolean(engrave && offer && !text);
  const soldOut = product.availability === "sold_out";
  const unit = unitPriceUsd(product, variantId, Boolean(text));
  const lines = [{ slug, qty: 1, ...(variantId ? { variantId } : {}), ...(text ? { engraving: text } : {}) }];
  const fullName = variant ? `${name}, ${variantLabel(variant, locale)}` : name;
  const size = variant?.sizeCm ?? product.sizeCm;
  const weight = variant?.weightG ?? product.weightG;
  const compareAt = variant?.priceUsd === undefined ? product.compareAtUsd : undefined;
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
                {variantLabel(v, locale)}
                {v.priceUsd !== undefined && v.priceUsd !== product.priceUsd && <> · {formatPrice(v.priceUsd, currency, locale)}</>}
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
        {!soldOut && !engravingMissing && <WhatsAppOrderButton lines={lines} label={t("orderOnlyThis")} className="btn btn-whatsapp btn-block" />}
        {children}
      </div>
      {!soldOut && !engravingMissing && <ProductOrderBar lines={lines} name={fullName} priceUsd={unit} />}
    </>
  );
}

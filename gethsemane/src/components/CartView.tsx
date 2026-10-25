"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CONTACT_EMAIL } from "@/config/store";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { useCart, useHydrated, useOrderDetails } from "@/lib/client-store";
import { formatPrice } from "@/lib/currency";
import {
  buildOrderMessage,
  fitOrderMessage,
  linePriceUsd,
  lineProduct,
  orderVariant,
  unitPrice,
  type OrderLookup,
} from "@/lib/order-message";
import {
  MAX_CART_LINES,
  MAX_QTY,
  ORDER_DETAIL_LIMITS,
  lineKey,
} from "@/lib/storage";
import { encodeMessage, whatsappUrl } from "@/lib/whatsapp";
import { useCurrency } from "./CurrencyProvider";
import { CartIcon, ChatIcon } from "./Icons";
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

/**
 * `lookup` holds every product in the page language (compact, from the server); `firstCategory` is suggested
 * when the order is empty.
 */
export function CartView({ lookup, firstCategory }: { lookup: OrderLookup; firstCategory: { slug: string; name: string } }) {
  const t = useTranslations("cart");
  const tw = useTranslations("whatsapp");
  const locale = useLocale() as Locale;
  const { currency } = useCurrency();
  const hydrated = useHydrated();
  const { lines, setQty, remove } = useCart();
  const { details, update, clear } = useOrderDetails();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const ids = {
    name: useId(),
    country: useId(),
    countryHint: useId(),
    notes: useId(),
    gift: useId(),
    giftText: useId(),
    preview: useId(),
  };
  const email = CONTACT_EMAIL ? "set" : "none";

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
  const orderDetails = {
    name: details.name,
    country: details.country,
    notes: details.notes,
    // A ticked gift-note box is always mentioned, even before any text is typed.
    giftNote: details.giftNote ? details.giftNoteText : undefined,
  };
  // The preview and the copy button carry the full message; the WhatsApp link may shorten very long notes.
  const message = buildOrderMessage(tw, lines, lookup, currency, locale, orderDetails);
  const { message: linkMessage, shortened } = fitOrderMessage(
    tw,
    lines,
    lookup,
    currency,
    locale,
    orderDetails,
  );
  const hasDetails = Boolean(
    details.name ||
    details.country ||
    details.notes ||
    details.giftNote ||
    details.giftNoteText,
  );
  const atLimit = lines.length >= MAX_CART_LINES;

  const changeQty = (key: string, name: string, qty: number) => {
    const next = clampQty(qty);
    setQty(key, next);
    announce(t("quantityChanged", { name, qty: next }));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
      previewRef.current?.focus();
      previewRef.current?.select();
    }
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
          <span className="price subtotal-usd">
            {formatPrice(totalUsd, "USD", locale)}
          </span>
        </div>
        {currency !== "USD" && (
          <div className="summary-row summary-approx">
            <span>{t("approxTotal", { currency })}</span>
            <span className="price subtotal">
              ≈ {formatPrice(totalUsd, currency, locale)}
            </span>
          </div>
        )}
        <div className="summary-row summary-shipping">
          <span>{t("shippingLabel")}</span>
          <span>{t("shippingValue")}</span>
        </div>

        <fieldset className="order-details">
          <legend>{t("detailsTitle")}</legend>
          <p className="note">{t("detailsHint")}</p>
          <div className="field">
            <label htmlFor={ids.name}>{t("name")}</label>
            <input
              id={ids.name}
              type="text"
              autoComplete="name"
              maxLength={ORDER_DETAIL_LIMITS.name}
              value={details.name}
              onChange={(e) => update({ name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.country}>{t("country")}</label>
            <input
              id={ids.country}
              type="text"
              autoComplete="country-name"
              aria-describedby={ids.countryHint}
              maxLength={ORDER_DETAIL_LIMITS.country}
              value={details.country}
              onChange={(e) => update({ country: e.target.value })}
            />
            <p className="note field-hint" id={ids.countryHint}>
              {t("countryHint")}
            </p>
          </div>
          <div className="field">
            <label htmlFor={ids.notes}>{t("notes")}</label>
            <textarea
              id={ids.notes}
              rows={3}
              maxLength={ORDER_DETAIL_LIMITS.notes}
              value={details.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
          <div className="field field-check">
            <input
              id={ids.gift}
              type="checkbox"
              checked={details.giftNote}
              onChange={(e) => update({ giftNote: e.target.checked })}
            />
            <label htmlFor={ids.gift}>{t("giftNote")}</label>
          </div>
          {details.giftNote && (
            <div className="field">
              <label htmlFor={ids.giftText}>{t("giftNoteText")}</label>
              <textarea
                id={ids.giftText}
                rows={2}
                maxLength={ORDER_DETAIL_LIMITS.giftNoteText}
                value={details.giftNoteText}
                onChange={(e) => update({ giftNoteText: e.target.value })}
              />
            </div>
          )}
          {hasDetails && (
            <button
              type="button"
              className="link-btn clear-details"
              onClick={() => {
                clear();
                announce(t("detailsCleared"));
              }}
            >
              {t("clearDetails")}
            </button>
          )}
        </fieldset>

        {!message && <p className="note">{t("nothingToSend")}</p>}
        {message && (
          <>
            <a
              className="btn btn-primary btn-block"
              href={whatsappUrl(linkMessage)}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="whatsapp-order"
            >
              <ChatIcon size={18} />
              {t("send")}
              <span className="sr-only"> ({tw("newTab")})</span>
            </a>
            {shortened && (
              <p className="note warning-note" role="status">
                {t("shortenedNote")}
              </p>
            )}
            <p className="note">{t("whatsappHint")}</p>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={copy}
            >
              {t("copy")}
            </button>
            <p className="note" role="status">
              {copyState === "copied"
                ? t("copied", { email })
                : copyState === "failed"
                  ? t("copyFailed")
                  : ""}
            </p>
            {CONTACT_EMAIL && (
              <p className="note">
                <a
                  className="text-link"
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeMessage(t("emailSubject"))}&body=${encodeMessage(message)}`}
                  data-testid="email-order"
                >
                  {t("sendEmail", { email: CONTACT_EMAIL })}
                </a>
              </p>
            )}
            <details
              className="message-preview"
              open={copyState === "failed" || undefined}
            >
              <summary>{t("messagePreview")}</summary>
              <label htmlFor={ids.preview} className="sr-only">
                {t("messagePreview")}
              </label>
              <textarea
                id={ids.preview}
                ref={previewRef}
                readOnly
                rows={10}
                value={message}
                data-testid="message-preview"
              />
            </details>
          </>
        )}
        <Link href="/shop" className="btn btn-secondary btn-block">
          {t("continue")}
        </Link>
      </section>
    </div>
  );
}

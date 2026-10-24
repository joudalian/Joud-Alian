"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { getProduct, productText, type ProductSlug } from "@/lib/catalog";
import { useCart, useHydrated, useOrderDetails } from "@/lib/client-store";
import { formatPrice } from "@/lib/currency";
import { buildOrderMessage } from "@/lib/order-message";
import { MAX_QTY, ORDER_DETAIL_LIMITS } from "@/lib/storage";
import { whatsappUrl } from "@/lib/whatsapp";
import { useCurrency } from "./CurrencyProvider";
import { CartIcon, ChatIcon } from "./Icons";
import { announce } from "./LiveRegion";
import { Price } from "./Price";

export function CartView() {
  const t = useTranslations("cart");
  const tw = useTranslations("whatsapp");
  const locale = useLocale() as Locale;
  const { currency } = useCurrency();
  const hydrated = useHydrated();
  const { lines, setQty, remove } = useCart();
  const { details, update } = useOrderDetails();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const previewRef = useRef<HTMLTextAreaElement>(null);
  const ids = { name: useId(), country: useId(), notes: useId(), gift: useId(), giftText: useId(), preview: useId() };

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
        <p>{t.rich("emptyText", { link: (chunks) => <Link href="/shop/nativity">{chunks}</Link> })}</p>
        <Link href="/shop" className="btn btn-primary">
          {t("shop")}
        </Link>
      </div>
    );
  }

  const totalUsd = lines.reduce((sum, l) => sum + (getProduct(l.slug)?.priceUsd ?? 0) * l.qty, 0);
  const message = buildOrderMessage(tw, lines, currency, locale, {
    name: details.name,
    country: details.country,
    notes: details.notes,
    giftNote: details.giftNote ? details.giftNoteText : "",
  });

  const changeQty = (slug: ProductSlug, name: string, qty: number) => {
    const next = Math.max(1, Math.min(MAX_QTY, Math.round(qty) || 1));
    setQty(slug, next);
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

  return (
    <div className="cart-layout">
      <ul className="line-list">
        {lines.map((line) => {
          const product = getProduct(line.slug);
          if (!product) return null;
          const name = productText(product, locale).name;
          const qtyId = `qty-${line.slug}`;
          return (
            <li key={line.slug} className="line">
              {/* The product name next to the photo already names it. */}
              <Image src={product.image} alt="" width={88} height={110} sizes="88px" />
              <div>
                <h2>
                  <Link href={`/product/${line.slug}`}>{name}</Link>
                </h2>
                <Price usd={product.priceUsd} />
                <div className="line-controls">
                  <div className="stepper">
                    <button type="button" aria-label={t("decrease", { name })} disabled={line.qty <= 1} onClick={() => changeQty(line.slug, name, line.qty - 1)}>
                      −
                    </button>
                    <label htmlFor={qtyId} className="sr-only">
                      {t("quantityOf", { name })}
                    </label>
                    <input
                      id={qtyId}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_QTY}
                      value={line.qty}
                      onChange={(e) => changeQty(line.slug, name, Number(e.target.value))}
                    />
                    <button
                      type="button"
                      aria-label={t("increase", { name })}
                      disabled={line.qty >= MAX_QTY}
                      onClick={() => changeQty(line.slug, name, line.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="link-btn"
                    aria-label={t("removeItem", { name })}
                    onClick={() => {
                      remove(line.slug);
                      announce(t("removed", { name }));
                    }}
                  >
                    {t("remove")}
                  </button>
                  <Price usd={product.priceUsd * line.qty} className="price line-total" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

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

        <fieldset className="order-details">
          <legend>{t("detailsTitle")}</legend>
          <p className="note">{t("detailsHint")}</p>
          <div className="field">
            <label htmlFor={ids.name}>{t("name")}</label>
            <input id={ids.name} type="text" autoComplete="name" maxLength={ORDER_DETAIL_LIMITS.name} value={details.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor={ids.country}>{t("country")}</label>
            <input
              id={ids.country}
              type="text"
              autoComplete="country-name"
              maxLength={ORDER_DETAIL_LIMITS.country}
              value={details.country}
              onChange={(e) => update({ country: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor={ids.notes}>{t("notes")}</label>
            <textarea id={ids.notes} rows={3} maxLength={ORDER_DETAIL_LIMITS.notes} value={details.notes} onChange={(e) => update({ notes: e.target.value })} />
          </div>
          <div className="field field-check">
            <input id={ids.gift} type="checkbox" checked={details.giftNote} onChange={(e) => update({ giftNote: e.target.checked })} />
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
        </fieldset>

        <a className="btn btn-primary btn-block" href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" data-testid="whatsapp-order">
          <ChatIcon size={18} />
          {t("send")}
          <span className="sr-only"> ({tw("newTab")})</span>
        </a>
        <p className="note">{t("whatsappHint")}</p>
        <button type="button" className="btn btn-secondary btn-block" onClick={copy}>
          {t("copy")}
        </button>
        <p className="note" role="status">
          {copyState === "copied" ? t("copied") : copyState === "failed" ? t("copyFailed") : ""}
        </p>
        <details className="message-preview" open={copyState === "failed" || undefined}>
          <summary>{t("messagePreview")}</summary>
          <label htmlFor={ids.preview} className="sr-only">
            {t("messagePreview")}
          </label>
          <textarea id={ids.preview} ref={previewRef} readOnly rows={10} value={message} data-testid="message-preview" />
        </details>
        <Link href="/shop" className="btn btn-secondary btn-block">
          {t("continue")}
        </Link>
      </section>
    </div>
  );
}

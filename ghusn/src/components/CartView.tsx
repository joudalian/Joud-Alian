"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { getProduct, productText } from "@/lib/catalog";
import { useCart, useHydrated } from "@/lib/client-store";
import { MAX_QTY } from "@/lib/storage";
import { CartIcon } from "./Icons";
import { Price } from "./Price";
import { WhatsAppOrderButton } from "./WhatsAppOrder";

export function CartView() {
  const t = useTranslations("cart");
  const locale = useLocale() as Locale;
  const hydrated = useHydrated();
  const { lines, setQty, remove } = useCart();

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
        <p>{t("emptyText")}</p>
        <Link href="/shop" className="btn btn-primary">
          {t("continue")}
        </Link>
      </div>
    );
  }

  const subtotalUsd = lines.reduce((sum, l) => sum + (getProduct(l.slug)?.priceUsd ?? 0) * l.qty, 0);

  return (
    <div className="cart-layout">
      <ul className="line-list">
        {lines.map((line) => {
          const product = getProduct(line.slug);
          if (!product) return null;
          const name = productText(product, locale).name;
          return (
            <li key={line.slug} className="line">
              <Image src={product.image} alt={name} width={88} height={110} sizes="88px" />
              <div>
                <h2>
                  <Link href={`/product/${line.slug}`}>{name}</Link>
                </h2>
                <Price usd={product.priceUsd} />
                <div className="line-controls">
                  <div className="stepper" role="group" aria-label={t("quantityOf", { name })}>
                    <button
                      type="button"
                      aria-label={t("decrease", { name })}
                      disabled={line.qty <= 1}
                      onClick={() => setQty(line.slug, line.qty - 1)}
                    >
                      −
                    </button>
                    <output aria-live="polite">{line.qty}</output>
                    <button
                      type="button"
                      aria-label={t("increase", { name })}
                      disabled={line.qty >= MAX_QTY}
                      onClick={() => setQty(line.slug, line.qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button type="button" className="link-btn" aria-label={t("removeItem", { name })} onClick={() => remove(line.slug)}>
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
          <span>{t("subtotal")}</span>
          <Price usd={subtotalUsd} className="price subtotal" />
        </div>
        <p className="note">{t("shippingNote")}</p>
        <div className="summary-actions">
          <WhatsAppOrderButton lines={lines} />
          <p className="note">{t("whatsappHint")}</p>
        </div>
        <Link href="/shop" className="btn btn-secondary btn-block">
          {t("continue")}
        </Link>
      </section>
    </div>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { getQuote, placeOrder, type QuoteView } from "@/app/[locale]/(app)/checkout/actions";
import { idle } from "@/components/forms/ActionForm";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locales";
import { useCart, useHydrated } from "@/lib/client-store";
import { formatPrice } from "@/lib/currency";
import { useCurrency } from "../CurrencyProvider";

export type SavedAddress = { id: string; name: string; line1: string; line2: string; city: string; region: string; postalCode: string; country: string; phone: string; isDefault: boolean };
type Address = Omit<SavedAddress, "id" | "isDefault">;
const blank: Address = { name: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "", phone: "" };

/**
 * Checkout: contact email, shipping address, shipping method, gift note, discount code and the order review.
 * Every amount shown comes from the server (getQuote); the order is placed with placeOrder, which prices it again
 * and refuses it if the total changed. Payment then happens on Stripe's hosted page.
 */
export function CheckoutForm({
  countries,
  saved,
  user,
  testMode,
  stripeNote,
  confirmEngraving = false,
}: {
  countries: { code: string; name: string }[];
  saved: SavedAddress[];
  user: { email: string; name: string } | null;
  testMode: boolean;
  stripeNote: boolean;
  /** FEATURES.engravingPreview: engraved lines need an explicit "the text is correct" tick. */
  confirmEngraving?: boolean;
}) {
  const t = useTranslations("checkout");
  const ta = useTranslations("address");
  const locale = useLocale() as Locale;
  const { currency } = useCurrency();
  const hydrated = useHydrated();
  const { lines } = useCart();
  const initial = saved.find((a) => a.isDefault) ?? saved[0];
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState<Address>(initial ? { ...initial } : { ...blank, name: user?.name ?? "" });
  const [method, setMethod] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [gift, setGift] = useState(false);
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, formAction, pending] = useActionState(placeOrder, idle);
  const request = useRef(0);
  const id = useId();
  const field = (name: string) => `${id}-${name}`;

  const linesJson = JSON.stringify(lines);
  useEffect(() => {
    if (!hydrated) return;
    const mine = ++request.current;
    setLoading(true);
    const timer = setTimeout(() => {
      getQuote({ locale, lines: JSON.parse(linesJson), country: address.country, shippingMethod: method, couponCode: coupon, email })
        .then((q) => {
          if (mine !== request.current) return;
          setQuote(q);
          if (q?.shippingMethod && q.shippingMethod !== method) setMethod(q.shippingMethod);
        })
        // Network failure: no quote, so nothing can be paid; the next change retries.
        .catch(() => mine === request.current && setQuote(null))
        .finally(() => mine === request.current && setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
    // Email matters only for codes limited to one address; it is re-checked when the order is placed anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, linesJson, address.country, method, coupon, locale]);

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
        <p>{t("empty")}</p>
        <Link href="/shop" className="btn btn-primary">
          {t("toShop")}
        </Link>
      </div>
    );
  }

  const money = (cents: number) => formatPrice(cents / 100, "USD", locale);
  const set = (key: keyof Address) => (e: { target: { value: string } }) => setAddress((a) => ({ ...a, [key]: e.target.value }));
  const ready = Boolean(quote && quote.lines.length && !quote.problems.length && quote.countryAllowed && quote.shippingMethod);
  const input = (key: keyof Address, label: string, opts: { required?: boolean; auto: string; type?: string; max: number; hint?: string }) => (
    <div className="field">
      <label htmlFor={field(key)}>
        {label}
        {!opts.required && <span className="optional"> ({ta("optional")})</span>}
      </label>
      <input
        id={field(key)}
        name={`ship_${key}`}
        type={opts.type ?? "text"}
        autoComplete={opts.auto}
        required={opts.required}
        maxLength={opts.max}
        value={address[key]}
        onChange={set(key)}
        aria-describedby={opts.hint ? `${field(key)}-hint` : undefined}
      />
      {opts.hint && (
        <p className="note field-hint" id={`${field(key)}-hint`}>
          {opts.hint}
        </p>
      )}
    </div>
  );

  return (
    <form action={formAction} className="checkout-layout" data-testid="checkout-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="lines" value={linesJson} />
      <input type="hidden" name="expectedTotal" value={quote?.totalCents ?? ""} />
      <input type="hidden" name="coupon" value={coupon} />

      <div className="checkout-main">
        {testMode && (
          <p className="notice-inline warning-note" data-testid="test-mode">
            {t("testMode")}
          </p>
        )}

        <fieldset className="checkout-section">
          <legend>{t("contactTitle")}</legend>
          <div className="field">
            <label htmlFor={field("email")}>{t("email")}</label>
            <input
              id={field("email")}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={`${field("email")}-hint`}
            />
            <p className="note field-hint" id={`${field("email")}-hint`}>
              {t("emailHint")}
            </p>
          </div>
          {!user && (
            <p className="note">
              {t.rich("guestNote", { link: (chunks) => <Link href="/login?next=/checkout">{chunks}</Link> })}
            </p>
          )}
        </fieldset>

        <fieldset className="checkout-section">
          <legend>{t("shippingTitle")}</legend>
          {saved.length > 0 && (
            <div className="field">
              <label htmlFor={field("saved")}>{t("savedAddress")}</label>
              <select
                id={field("saved")}
                defaultValue={initial?.id ?? ""}
                onChange={(e) => {
                  const a = saved.find((s) => s.id === e.target.value);
                  setAddress(a ? { ...a } : { ...blank, name: user?.name ?? "" });
                }}
              >
                {saved.map((a) => (
                  <option key={a.id} value={a.id}>
                    {[a.name, a.line1, a.city].join(", ")}
                  </option>
                ))}
                <option value="">{t("newAddress")}</option>
              </select>
            </div>
          )}
          <div className="address-fields">
            {input("name", ta("name"), { required: true, auto: "shipping name", max: 100 })}
            <div className="field">
              <label htmlFor={field("country")}>{ta("country")}</label>
              <select id={field("country")} name="ship_country" autoComplete="shipping country" required value={address.country} onChange={set("country")}>
                <option value="" disabled>
                  {ta("countryChoose")}
                </option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {input("line1", ta("line1"), { required: true, auto: "shipping address-line1", max: 200 })}
            {input("line2", ta("line2"), { auto: "shipping address-line2", max: 200 })}
            <div className="field-row">
              {input("postalCode", ta("postalCode"), { auto: "shipping postal-code", max: 20 })}
              {input("city", ta("city"), { required: true, auto: "shipping address-level2", max: 100 })}
            </div>
            {input("region", ta("region"), { auto: "shipping address-level1", max: 100 })}
            {input("phone", ta("phone"), { auto: "shipping tel", type: "tel", max: 30, hint: ta("phoneHint") })}
          </div>
          {address.country && quote && !quote.countryAllowed && (
            <p className="form-message form-error" role="alert">
              {t("countryNotShipped")}
            </p>
          )}
        </fieldset>

        <fieldset className="checkout-section">
          <legend>{t("methodTitle")}</legend>
          {!quote?.shippingOptions.length ? (
            <p className="note">{t("methodAfterCountry")}</p>
          ) : (
            <div className="choice-list">
              {quote.shippingOptions.map((o) => (
                <label key={o.id} className="choice">
                  <input type="radio" name="shippingMethod" value={o.id} checked={method === o.id} onChange={() => setMethod(o.id)} />
                  <span>{o.label}</span>
                  <span className="choice-price">{o.cents === 0 && quote.freeShipping ? t("freeShippingApplied") : money(o.cents)}</span>
                </label>
              ))}
            </div>
          )}
          {testMode && <p className="note">{t("testRates")}</p>}
        </fieldset>

        <fieldset className="checkout-section">
          <legend>{t("giftTitle")}</legend>
          <div className="field field-check">
            <input id={field("gift")} type="checkbox" name="gift" checked={gift} onChange={(e) => setGift(e.target.checked)} />
            <label htmlFor={field("gift")}>{t("giftAdd")}</label>
          </div>
          {gift && (
            <div className="field">
              <label htmlFor={field("giftNote")}>{t("giftText")}</label>
              <textarea id={field("giftNote")} name="giftNote" rows={3} maxLength={500} />
              <p className="note field-hint">{t("giftHint")}</p>
            </div>
          )}
        </fieldset>
      </div>

      <aside className="checkout-summary summary" aria-labelledby={field("review")}>
        <h2 id={field("review")}>{t("reviewTitle")}</h2>
        {quote?.problems.map((p) => (
          <p key={p} className="form-message form-error" role="alert">
            {p}
          </p>
        ))}
        <ul className="review-lines" aria-busy={loading || undefined} data-testid="review-lines">
          {quote?.lines.map((l, i) => (
            <li key={`${l.slug}-${i}`}>
              <span>
                {l.quantity} × {l.name}
                {l.variant && <span className="item-detail">{l.variant}</span>}
                {l.engraving && <span className="item-detail">{t("engraving", { text: l.engraving })}</span>}
              </span>
              <span>{money(l.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <div className="coupon-row">
          <label htmlFor={field("coupon")}>{t("couponLabel")}</label>
          <div className="coupon-input">
            <input id={field("coupon")} type="text" autoComplete="off" maxLength={40} value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={() => setCoupon(couponInput.trim())}>
              {t("couponApply")}
            </button>
          </div>
          {quote?.couponMessage && (
            <p className={`note ${quote.coupon ? "" : "warning-note"}`} role="status" data-testid="coupon-message">
              {quote.couponMessage}
            </p>
          )}
        </div>
        {quote && (
          <dl className="review-totals" data-testid="review-totals">
            <div>
              <dt>{t("subtotal")}</dt>
              <dd>{money(quote.subtotalCents)}</dd>
            </div>
            {quote.discountCents > 0 && (
              <div>
                <dt>{t("discount", { code: quote.coupon ?? "" })}</dt>
                <dd>−{money(quote.discountCents)}</dd>
              </div>
            )}
            <div>
              <dt>{t("shipping")}</dt>
              <dd>{!quote.shippingMethod ? t("shippingTbd") : quote.shippingCents === 0 && quote.freeShipping ? t("freeShippingApplied") : money(quote.shippingCents)}</dd>
            </div>
            <div className="review-total">
              <dt>{t("totalUsd")}</dt>
              <dd data-testid="review-total">{money(quote.totalCents)}</dd>
            </div>
            {currency !== "USD" && (
              <div className="summary-approx">
                <dt>{t("approx", { currency })}</dt>
                <dd>≈ {formatPrice(quote.totalCents / 100, currency, locale)}</dd>
              </div>
            )}
          </dl>
        )}
        <p className="note">{t("chargedInUsd")}</p>
        {quote?.dutiesNote && (
          <p className="note" data-testid="duties-note">
            {quote.dutiesNote}
          </p>
        )}
        {confirmEngraving && quote?.lines.some((l) => l.engraving) && (
          <div className="field field-check" data-testid="engraving-confirm">
            <input id={field("engravingConfirmed")} type="checkbox" name="engravingConfirmed" required />
            <label htmlFor={field("engravingConfirmed")}>
              {t("engravingConfirm", {
                texts: quote.lines
                  .filter((l) => l.engraving)
                  .map((l) => `“${l.engraving}”`)
                  .join(", "),
              })}
            </label>
          </div>
        )}
        <div className="field field-check">
          <input id={field("terms")} type="checkbox" name="terms" required />
          <label htmlFor={field("terms")}>
            {t.rich("terms", {
              terms: (chunks) => <Link href="/terms">{chunks}</Link>,
              withdrawal: (chunks) => <Link href="/withdrawal">{chunks}</Link>,
              privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
            })}
          </label>
        </div>
        {state.message && (
          <p className="form-message form-error" role="alert">
            {state.message}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={!ready || loading || pending} data-testid="pay">
          {pending ? t("redirecting") : t("pay")}
        </button>
        <p className="note">{stripeNote ? t("stripeNote") : t("paymentPageNote")}</p>
      </aside>
    </form>
  );
}

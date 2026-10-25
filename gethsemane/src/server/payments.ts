import "server-only";
import { CATALOG_READY, SHIP_TO_COUNTRIES, SHIPPING_RATES_CONFIRMED } from "@/config/store";
import { backendStatus } from "./db";

/**
 * Payment mode, from the Stripe key in the environment (never from code):
 *   off  — no STRIPE_SECRET_KEY: checkout shows "Payments are opening soon"
 *   test — sk_test_/rk_test_: Stripe test mode; orders are marked as test orders and never fulfilled
 *   live — sk_live_/rk_live_: real payments
 */
export type PaymentMode = "off" | "test" | "live";

export function paymentMode(): PaymentMode {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (/^(sk|rk)_live_/.test(key)) return "live";
  if (/^(sk|rk)_test_/.test(key)) return "test";
  return "off";
}

/** True only with live keys: the site may then say that payments are processed by Stripe. */
export function livePayments(): boolean {
  return paymentMode() === "live" && checkoutBlock() === null;
}

export type CheckoutBlock = "payments-off" | "backend" | "webhook" | "shipping-unconfirmed" | "countries-unconfirmed" | "catalog-not-ready";

/**
 * Why checkout cannot take payments right now, or null when it can. Live payments additionally need confirmed
 * shipping prices, a confirmed list of destination countries and the launched catalog; test mode does not.
 */
export function checkoutBlock(): CheckoutBlock | null {
  const mode = paymentMode();
  if (mode === "off") return "payments-off";
  if (backendStatus()) return "backend";
  if (!process.env.STRIPE_WEBHOOK_SECRET) return "webhook";
  if (mode === "live") {
    if (!SHIPPING_RATES_CONFIRMED) return "shipping-unconfirmed";
    if (SHIP_TO_COUNTRIES.length === 0) return "countries-unconfirmed";
    if (!CATALOG_READY) return "catalog-not-ready";
  }
  return null;
}

import "server-only";
import Stripe from "stripe";
import type { Locale } from "@/i18n/locales";

const globalForStripe = globalThis as unknown as { gethsemaneStripe?: Stripe };

/**
 * The Stripe client (server only; card details never touch this site: customers pay on Stripe's hosted Checkout
 * page). STRIPE_API_BASE points the client at a local stand-in for the automated tests and is honoured only with a
 * test key, so live traffic can never be redirected.
 */
export function getStripe(): Stripe {
  if (globalForStripe.gethsemaneStripe) return globalForStripe.gethsemaneStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  const config: Stripe.StripeConfig = { maxNetworkRetries: 2, timeout: 20_000, telemetry: false, appInfo: { name: "Gethsemane" } };
  const base = process.env.STRIPE_API_BASE;
  if (base && /^(sk|rk)_test_/.test(key)) {
    const url = new URL(base);
    Object.assign(config, { host: url.hostname, port: Number(url.port), protocol: url.protocol.replace(":", "") as "http" | "https" });
  }
  globalForStripe.gethsemaneStripe = new Stripe(key, config);
  return globalForStripe.gethsemaneStripe;
}

/** Stripe Checkout's page language for ours (Ukrainian is not offered there yet: Stripe then picks from the browser). */
export function stripeLocale(locale: Locale): Stripe.Checkout.SessionCreateParams.Locale {
  const map: Partial<Record<Locale, Stripe.Checkout.SessionCreateParams.Locale>> = {
    en: "en-GB",
    fr: "fr",
    es: "es",
    it: "it",
    de: "de",
    el: "el",
    pl: "pl",
    ro: "ro",
    pt: "pt",
  };
  return map[locale] ?? "auto";
}

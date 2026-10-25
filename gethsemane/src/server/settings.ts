import "server-only";
import { CHRISTMAS_ORDER_BY_DATE, FREE_SHIPPING_THRESHOLD_USD, NEWSLETTER_WELCOME_COUPON } from "@/config/store";

// Store settings that a deployment may also set through environment variables of the same name (handy for a
// seasonal change without a code change, and for the tests). The values in src/config/store.ts are the defaults.

/** Items total in USD from which standard shipping is free, or null. */
export function freeShippingThresholdUsd(): number | null {
  const env = Number(process.env.FREE_SHIPPING_THRESHOLD_USD);
  if (process.env.FREE_SHIPPING_THRESHOLD_USD && Number.isFinite(env) && env > 0) return env;
  return FREE_SHIPPING_THRESHOLD_USD;
}

/** "YYYY-MM-DD" or "". */
export function christmasOrderByDate(): string {
  const value = process.env.CHRISTMAS_ORDER_BY_DATE ?? CHRISTMAS_ORDER_BY_DATE;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

/** Percent off for the newsletter welcome code (0 = no code). */
export function welcomeCouponPercent(): number {
  const env = Number(process.env.NEWSLETTER_WELCOME_PERCENT);
  const value = process.env.NEWSLETTER_WELCOME_PERCENT ? env : NEWSLETTER_WELCOME_COUPON.percent;
  return Number.isInteger(value) && value > 0 && value <= 50 ? value : 0;
}

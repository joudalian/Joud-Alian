import "server-only";
import { engravingSupported } from "@/lib/engraving";
import { feature } from "./features";
import { freeShippingThresholdUsd } from "./settings";
import { and, eq, sql } from "drizzle-orm";
import { SHIP_TO_COUNTRIES, SHIPPING_RATES } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { getProduct, getVariant, productText, variantLabel } from "@/lib/catalog";
import { COUNTRY_CODES } from "@/lib/countries";
import { regionOf, type ShippingRegion } from "@/lib/regions";
import { MAX_CART_LINES, MAX_ENGRAVING, MAX_QTY } from "@/lib/storage";
import { getDb } from "./db";
import { couponRedemptions, coupons } from "./db/schema";
import { paymentMode } from "./payments";

/**
 * The only place prices are computed for an order. Everything comes from the catalog and the config on the server:
 * the browser sends product slugs, variants, engraving text and quantities, never a price.
 */

export type CartInput = { slug: string; qty: number; variantId?: string; engraving?: string };

export type PricedLine = {
  slug: string;
  sku: string;
  name: string;
  nameLocalized: string;
  variantId: string | null;
  variantLabel: string | null;
  engraving: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type ShippingOption = { id: string; cents: number; days: readonly [number, number] };

export type LineProblem = { slug: string; reason: "unknown" | "sold_out" | "not_ready" | "variant" | "engraving" | "quantity" };

export type Quote = {
  lines: PricedLine[];
  problems: LineProblem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  region: ShippingRegion | null;
  shippingOptions: ShippingOption[];
  shippingMethod: string | null;
  coupon: { code: string; id: string } | null;
  couponError: null | "unknown" | "expired" | "minimum" | "used_up" | "email";
  countryAllowed: boolean;
  /** Standard shipping is free (FREE_SHIPPING_THRESHOLD_USD reached). */
  freeShipping: boolean;
  /** The free-shipping threshold in effect, or null when there is none. */
  freeShippingThresholdCents: number | null;
};

const cents = (usd: number) => Math.round(usd * 100);

/** Cart lines from untrusted JSON (the browser's cart), shape-checked and capped. */
export function parseCartInput(raw: unknown): CartInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_CART_LINES).flatMap((v): CartInput[] => {
    if (typeof v !== "object" || v === null) return [];
    const { slug, qty, variantId, engraving } = v as Record<string, unknown>;
    if (typeof slug !== "string" || slug.length > 80 || typeof qty !== "number" || !Number.isInteger(qty)) return [];
    return [
      {
        slug,
        qty,
        ...(typeof variantId === "string" && variantId ? { variantId: variantId.slice(0, 40) } : {}),
        ...(typeof engraving === "string" && engraving.trim() ? { engraving: engraving.replace(/\s+/g, " ").trim().slice(0, MAX_ENGRAVING) } : {}),
      },
    ];
  });
}

/** Countries a checkout may ship to: SHIP_TO_COUNTRIES once confirmed; in test mode, every country until then. */
export function shippableCountries(): readonly string[] {
  if (SHIP_TO_COUNTRIES.length) return SHIP_TO_COUNTRIES;
  return paymentMode() === "test" ? COUNTRY_CODES : [];
}

function priceLines(input: CartInput[], locale: Locale) {
  const lines: PricedLine[] = [];
  const problems: LineProblem[] = [];
  const live = paymentMode() === "live";
  for (const item of input) {
    const product = getProduct(item.slug);
    if (!product) {
      problems.push({ slug: item.slug, reason: "unknown" });
      continue;
    }
    if (product.availability === "sold_out") {
      problems.push({ slug: item.slug, reason: "sold_out" });
      continue;
    }
    // Real payments only for products whose texts are complete and checked; test mode may use the placeholders.
    if (live && !product.launchReady) {
      problems.push({ slug: item.slug, reason: "not_ready" });
      continue;
    }
    if (item.qty < 1 || item.qty > MAX_QTY) {
      problems.push({ slug: item.slug, reason: "quantity" });
      continue;
    }
    const variant = getVariant(product, item.variantId);
    if ((item.variantId && !variant) || (!item.variantId && product.variants.length > 0)) {
      problems.push({ slug: item.slug, reason: "variant" });
      continue;
    }
    const engraving = item.engraving ?? null;
    if (engraving && (!product.engraving?.enabled || Array.from(engraving).length > product.engraving.maxChars || !engravingSupported(engraving))) {
      problems.push({ slug: item.slug, reason: "engraving" });
      continue;
    }
    const unit = cents((variant?.priceUsd ?? product.priceUsd) + (engraving && product.engraving?.enabled ? product.engraving.extraUsd : 0));
    lines.push({
      slug: product.slug,
      sku: variant?.sku ?? product.sku,
      name: product.text.en.name,
      nameLocalized: productText(product, locale).name,
      variantId: variant?.id ?? null,
      variantLabel: variant ? variantLabel(variant, locale) : null,
      engraving,
      unitPriceCents: unit,
      quantity: item.qty,
      lineTotalCents: unit * item.qty,
    });
  }
  return { lines, problems };
}

async function findCoupon(code: string, subtotalCents: number, email: string | undefined) {
  const db = await getDb();
  const [coupon] = await db
    .select()
    .from(coupons)
    .where(and(eq(coupons.code, code.trim().toUpperCase()), eq(coupons.active, true)));
  if (!coupon) return { error: "unknown" as const };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return { error: "expired" as const };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return { error: "used_up" as const };
  if (subtotalCents < coupon.minSubtotalCents) return { error: "minimum" as const };
  if (coupon.email && coupon.email.toLowerCase() !== email?.trim().toLowerCase()) return { error: "email" as const };
  if (coupon.singleUsePerEmail && email) {
    const [used] = await db
      .select({ n: sql<number>`count(*)` })
      .from(couponRedemptions)
      .where(and(eq(couponRedemptions.couponId, coupon.id), sql`lower(${couponRedemptions.email}) = ${email.trim().toLowerCase()}`));
    if (Number(used?.n ?? 0) > 0) return { error: "used_up" as const };
  }
  const discount = coupon.kind === "percent" ? Math.round((subtotalCents * Math.min(100, coupon.amount)) / 100) : coupon.amount;
  return { coupon, discount: Math.min(discount, subtotalCents) };
}

/** Prices a cart for a destination, shipping method and optional coupon. Never trusts anything from the browser. */
export async function quote(
  input: CartInput[],
  opts: { locale: Locale; country?: string; shippingMethod?: string; couponCode?: string; email?: string },
): Promise<Quote> {
  const { lines, problems } = priceLines(input, opts.locale);
  const subtotalCents = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  const country = opts.country?.toUpperCase() ?? "";
  const countryAllowed = Boolean(country) && shippableCountries().includes(country);
  const region = countryAllowed ? regionOf(country) : null;
  const shippingOptions: ShippingOption[] = region ? SHIPPING_RATES[region].map((r) => ({ id: r.id, cents: cents(r.usd), days: r.days })) : [];
  const method = shippingOptions.find((o) => o.id === opts.shippingMethod) ?? shippingOptions[0] ?? null;
  let discountCents = 0;
  let coupon: Quote["coupon"] = null;
  let couponError: Quote["couponError"] = null;
  if (opts.couponCode?.trim() && lines.length) {
    const found = await findCoupon(opts.couponCode, subtotalCents, opts.email);
    if ("error" in found) couponError = found.error ?? null;
    else {
      coupon = { code: found.coupon.code, id: found.coupon.id };
      discountCents = found.discount;
    }
  }
  // Free standard shipping from FREE_SHIPPING_THRESHOLD_USD (items after discount), when the feature is on.
  const threshold = feature("freeShippingBar") ? freeShippingThresholdUsd() : null;
  const freeShipping = threshold !== null && lines.length > 0 && subtotalCents - discountCents >= cents(threshold);
  if (freeShipping) for (const o of shippingOptions) if (o.id === "standard") o.cents = 0;
  const shippingCents = method ? (shippingOptions.find((o) => o.id === method.id)?.cents ?? method.cents) : 0;
  return {
    lines,
    problems,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: subtotalCents - discountCents + shippingCents,
    region,
    shippingOptions,
    shippingMethod: method?.id ?? null,
    coupon,
    couponError,
    countryAllowed,
    freeShipping,
    freeShippingThresholdCents: threshold === null ? null : cents(threshold),
  };
}

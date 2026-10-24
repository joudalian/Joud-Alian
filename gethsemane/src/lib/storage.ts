// zod/mini: the same validation as the classic API, but tree-shakable (about 30 KB less JavaScript on every page).
import { z } from "zod/mini";
import { isProductSlug, type ProductSlug } from "./catalog";
import { defaultCurrency, isCurrency, type Currency } from "./currency";
import { isLocale, type Locale } from "@/i18n/locales";

// Zod probes `new Function()` to enable a JIT; the CSP forbids eval, so run it without.
z.config({ jitless: true });

export const STORAGE_KEYS = {
  cart: "gethsemane.cart.v1",
  wishlist: "gethsemane.wishlist.v1",
  currency: "gethsemane.currency.v1",
  language: "gethsemane.language.v1",
  orderDetails: "gethsemane.order-details.v1",
} as const;

export const MAX_CART_LINES = 50;
export const MAX_QTY = 20;
export const MAX_WISHLIST = 100;
/** Anything larger than this cannot be a legitimate value and is discarded before parsing. */
const MAX_RAW_LENGTH = 16_384;

export type CartLine = { slug: ProductSlug; qty: number };

const cartSchema = z
  .array(
    z.object({
      slug: z.string().check(z.maxLength(64)),
      qty: z.int().check(z.minimum(1), z.maximum(MAX_QTY)),
    }),
  )
  .check(z.maxLength(MAX_CART_LINES * 4));

const wishlistSchema = z.array(z.string().check(z.maxLength(64))).check(z.maxLength(MAX_WISHLIST * 4));

function safeJson(raw: string | null | undefined): unknown {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_RAW_LENGTH) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

export function parseCart(raw: string | null | undefined): CartLine[] {
  const result = cartSchema.safeParse(safeJson(raw));
  if (!result.success) return [];
  const merged = new Map<ProductSlug, number>();
  for (const line of result.data) {
    if (!isProductSlug(line.slug)) continue;
    merged.set(line.slug, Math.min(MAX_QTY, (merged.get(line.slug) ?? 0) + line.qty));
  }
  return [...merged].slice(0, MAX_CART_LINES).map(([slug, qty]) => ({ slug, qty }));
}

export function parseWishlist(raw: string | null | undefined): ProductSlug[] {
  const result = wishlistSchema.safeParse(safeJson(raw));
  if (!result.success) return [];
  return [...new Set(result.data.filter(isProductSlug))].slice(0, MAX_WISHLIST);
}

export const ORDER_DETAIL_LIMITS = { name: 100, country: 100, notes: 1000, giftNoteText: 500 } as const;

export type OrderDetailsState = { name: string; country: string; notes: string; giftNote: boolean; giftNoteText: string };
export const emptyOrderDetails: OrderDetailsState = { name: "", country: "", notes: "", giftNote: false, giftNoteText: "" };

const limitedText = (max: number) => z.catch(z.string().check(z.maxLength(max)), "");
const orderDetailsSchema = z.object({
  name: limitedText(ORDER_DETAIL_LIMITS.name),
  country: limitedText(ORDER_DETAIL_LIMITS.country),
  notes: limitedText(ORDER_DETAIL_LIMITS.notes),
  giftNote: z.catch(z.boolean(), false),
  giftNoteText: limitedText(ORDER_DETAIL_LIMITS.giftNoteText),
});

/** Optional order details typed on the order page; kept in the browser only. Invalid fields reset to "". */
export function parseOrderDetails(raw: string | null | undefined): OrderDetailsState {
  const value = safeJson(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyOrderDetails;
  const result = orderDetailsSchema.safeParse(value);
  return result.success ? result.data : emptyOrderDetails;
}

export function parseCurrency(raw: string | null | undefined): Currency {
  return isCurrency(raw) ? raw : defaultCurrency;
}

export function parseLanguage(raw: string | null | undefined): Locale | undefined {
  return isLocale(raw) ? raw : undefined;
}

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode, quota, disabled); the in-memory state still works.
  }
}

export function setCookie(name: string, value: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

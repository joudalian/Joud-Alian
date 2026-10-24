import { z } from "zod";
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
      slug: z.string().max(64),
      qty: z.number().int().min(1).max(MAX_QTY),
    }),
  )
  .max(MAX_CART_LINES * 4);

const wishlistSchema = z.array(z.string().max(64)).max(MAX_WISHLIST * 4);

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

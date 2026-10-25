// Runs in the browser on every page (header counts), so the checks are written out by hand: no zod and no
// catalog here. Everything read from localStorage is untrusted and checked field by field.
import { defaultCurrency, isCurrency, type Currency } from "./currency";
import { isLocale, type Locale } from "@/i18n/locales";

type ProductSlug = string;

export const STORAGE_KEYS = {
  cart: "gethsemane.cart.v2",
  /** Previous cart format ({ slug, qty }[]), migrated to v2 on first read. */
  cartV1: "gethsemane.cart.v1",
  wishlist: "gethsemane.wishlist.v1",
  currency: "gethsemane.currency.v1",
  language: "gethsemane.language.v1",
  /** No longer written: details typed on the former WhatsApp order page, removed from browsers on the order page. */
  orderDetails: "gethsemane.order-details.v1",
} as const;

export const MAX_CART_LINES = 50;
export const MAX_QTY = 20;
export const MAX_WISHLIST = 100;
/** Anything larger than this cannot be a legitimate value and is discarded before parsing. */
const MAX_RAW_LENGTH = 16_384;

/**
 * One line of the order. The same piece with another variant or engraving text is a separate line.
 * `slug` may name a product that no longer exists: the order page then shows it as no longer available.
 */
export type CartLine = { slug: ProductSlug; qty: number; variantId?: string; engraving?: string };
export const MAX_ENGRAVING = 200;

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const isSlug = (v: unknown, max: number): v is string => isText(v, max) && SLUG.test(v);

/** One stored line, or undefined when any field is invalid (unknown fields are dropped). */
function storedLine(v: unknown): CartLine | undefined {
  if (!isRecord(v) || !isSlug(v.slug, 80)) return undefined;
  const { qty, variantId, engraving } = v;
  if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return undefined;
  if (variantId !== undefined && !isSlug(variantId, 40)) return undefined;
  if (engraving !== undefined && !isText(engraving, MAX_ENGRAVING)) return undefined;
  return { slug: v.slug, qty, ...(variantId !== undefined ? { variantId } : {}), ...(engraving !== undefined ? { engraving } : {}) };
}

/** Identity of a cart line: product, variant and engraving text. */
export function lineKey(line: Pick<CartLine, "slug" | "variantId" | "engraving">): string {
  return `${line.slug}|${line.variantId ?? ""}|${line.engraving ?? ""}`;
}

function safeJson(raw: string | null | undefined): unknown {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_RAW_LENGTH) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/** Reads the v2 cart (or a v1 cart: same shape without variant and engraving). Unknown slugs are kept. */
export function parseCart(raw: string | null | undefined): CartLine[] {
  const data = safeJson(raw);
  if (!Array.isArray(data) || data.length > MAX_CART_LINES * 4) return [];
  const lines = data.map(storedLine);
  // One invalid line rejects the whole stored cart.
  if (lines.some((line) => line === undefined)) return [];
  const merged = new Map<string, CartLine>();
  for (const line of lines as CartLine[]) {
    const engraving = line.engraving?.replace(/\s+/g, " ").trim() || undefined;
    const clean: CartLine = { slug: line.slug, qty: line.qty, ...(line.variantId ? { variantId: line.variantId } : {}), ...(engraving ? { engraving } : {}) };
    const key = lineKey(clean);
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, qty: Math.min(MAX_QTY, existing.qty + clean.qty) } : clean);
  }
  return [...merged.values()].slice(0, MAX_CART_LINES);
}

/** Slugs of pieces no longer in the shop are kept here and left out where the list is shown or counted. */
export function parseWishlist(raw: string | null | undefined): ProductSlug[] {
  const data = safeJson(raw);
  if (!Array.isArray(data) || data.length > MAX_WISHLIST * 4 || !data.every((s) => isText(s, 64))) return [];
  return [...new Set(data.filter((s) => SLUG.test(s)))].slice(0, MAX_WISHLIST);
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

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing was stored.
  }
}

export function setCookie(name: string, value: string): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

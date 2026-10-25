"use client";

import { createContext, createElement, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { lineFits, type CartRules } from "./cart-lookup";
import {
  MAX_CART_LINES,
  MAX_QTY,
  MAX_WISHLIST,
  STORAGE_KEYS,
  lineKey,
  parseCart,
  parseWishlist,
  readStorage,
  removeStorage,
  writeStorage,
  type CartLine,
} from "./storage";

type Listener = () => void;
type ProductSlug = string;

const CartRulesContext = createContext<CartRules>({});

/** Gives the header counts the rules for which stored lines still count (set once in the locale layout). */
export function CartRulesProvider({ rules, children }: { rules: CartRules; children: ReactNode }) {
  return createElement(CartRulesContext.Provider, { value: rules }, children);
}

/** A localStorage-backed list that is validated on every read and synced across tabs. */
function createListStore<T>(key: string, parse: (raw: string | null) => T[], legacyKey?: string) {
  const listeners = new Set<Listener>();
  const empty: T[] = [];
  let cachedRaw: string | null | undefined;
  let cachedValue: T[] = empty;
  // Used when storage is unavailable so the session still works in memory.
  let memory: string | null = null;

  function getSnapshot(): T[] {
    let raw = readStorage(key) ?? memory;
    if (raw === null && legacyKey) {
      // One-time migration from the previous format: copy it to the new key and drop the old one.
      const legacy = readStorage(legacyKey);
      if (legacy !== null) {
        raw = JSON.stringify(parse(legacy));
        memory = raw;
        writeStorage(key, raw);
        removeStorage(legacyKey);
      }
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = parse(raw);
    }
    return cachedValue;
  }

  function set(next: T[]) {
    const raw = JSON.stringify(next);
    memory = raw;
    writeStorage(key, raw);
    listeners.forEach((l) => l());
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key || e.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { getSnapshot, getServerSnapshot: () => empty, subscribe, set };
}

const cartStore = createListStore<CartLine>(STORAGE_KEYS.cart, parseCart, STORAGE_KEYS.cartV1);
const wishlistStore = createListStore<ProductSlug>(STORAGE_KEYS.wishlist, parseWishlist);

export function useCart() {
  const rules = useContext(CartRulesContext);
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);

  /** Adds a piece; the same piece, variant and engraving text adds to the existing line. */
  const add = useCallback((slug: ProductSlug, options: { qty?: number; variantId?: string; engraving?: string } = {}) => {
    const qty = options.qty ?? 1;
    const engraving = options.engraving?.replace(/\s+/g, " ").trim() || undefined;
    const line: CartLine = { slug, qty, ...(options.variantId ? { variantId: options.variantId } : {}), ...(engraving ? { engraving } : {}) };
    const key = lineKey(line);
    const current = cartStore.getSnapshot();
    if (current.some((l) => lineKey(l) === key)) {
      cartStore.set(current.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l)));
    } else if (current.length < MAX_CART_LINES) {
      cartStore.set([...current, { ...line, qty: Math.min(MAX_QTY, qty) }]);
    }
  }, []);

  /** `key` is lineKey(line). */
  const setQty = useCallback((key: string, qty: number) => {
    const current = cartStore.getSnapshot();
    if (qty < 1) cartStore.set(current.filter((l) => lineKey(l) !== key));
    else cartStore.set(current.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)));
  }, []);

  const remove = useCallback((key: string) => {
    cartStore.set(cartStore.getSnapshot().filter((l) => lineKey(l) !== key));
  }, []);

  // Pieces that can still be ordered (lines for removed products are not counted).
  const count = lines.reduce((sum, l) => sum + (lineFits(l, rules[l.slug]) ? l.qty : 0), 0);
  return { lines, count, add, setQty, remove };
}

/** For WishlistSync: read, replace and watch the stored wishlist outside React. */
export const wishlistAccess = {
  get: () => wishlistStore.getSnapshot(),
  set: (items: ProductSlug[]) => wishlistStore.set(items.slice(0, MAX_WISHLIST)),
  subscribe: (listener: () => void) => wishlistStore.subscribe(listener),
};

export function useWishlist() {
  const rules = useContext(CartRulesContext);
  const items = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getSnapshot, wishlistStore.getServerSnapshot);

  const toggle = useCallback((slug: ProductSlug) => {
    // Writing drops slugs of pieces no longer in the shop.
    const current = wishlistStore.getSnapshot().filter((s) => Object.hasOwn(rules, s));
    if (current.includes(slug)) wishlistStore.set(current.filter((s) => s !== slug));
    else if (current.length < MAX_WISHLIST) wishlistStore.set([...current, slug]);
  }, [rules]);

  const remove = useCallback((slug: ProductSlug) => {
    wishlistStore.set(wishlistStore.getSnapshot().filter((s) => s !== slug));
  }, []);

  // Pieces still in the shop (slugs of removed products stay stored but are not counted).
  const count = items.filter((slug) => Object.hasOwn(rules, slug)).length;
  return { items, count, toggle, remove, has: (slug: ProductSlug) => items.includes(slug) };
}

const noopSubscribe = () => () => {};

/** False during server rendering and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Empties the order (after a successful checkout). */
export function clearCart() {
  cartStore.set([]);
}

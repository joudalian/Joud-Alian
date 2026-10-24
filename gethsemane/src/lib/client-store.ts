"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ProductSlug } from "./catalog";
import {
  MAX_CART_LINES,
  MAX_QTY,
  MAX_WISHLIST,
  STORAGE_KEYS,
  emptyOrderDetails,
  parseCart,
  parseOrderDetails,
  parseWishlist,
  readStorage,
  removeStorage,
  writeStorage,
  type CartLine,
  type OrderDetailsState,
} from "./storage";

type Listener = () => void;

/** A localStorage-backed list that is validated on every read and synced across tabs. */
function createListStore<T>(key: string, parse: (raw: string | null) => T[]) {
  const listeners = new Set<Listener>();
  const empty: T[] = [];
  let cachedRaw: string | null | undefined;
  let cachedValue: T[] = empty;
  // Used when storage is unavailable so the session still works in memory.
  let memory: string | null = null;

  function getSnapshot(): T[] {
    const raw = readStorage(key) ?? memory;
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

const cartStore = createListStore<CartLine>(STORAGE_KEYS.cart, parseCart);
const wishlistStore = createListStore<ProductSlug>(STORAGE_KEYS.wishlist, parseWishlist);

export function useCart() {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);

  const add = useCallback((slug: ProductSlug, qty = 1) => {
    const current = cartStore.getSnapshot();
    const existing = current.find((l) => l.slug === slug);
    if (existing) {
      cartStore.set(current.map((l) => (l.slug === slug ? { ...l, qty: Math.min(MAX_QTY, l.qty + qty) } : l)));
    } else if (current.length < MAX_CART_LINES) {
      cartStore.set([...current, { slug, qty: Math.min(MAX_QTY, qty) }]);
    }
  }, []);

  const setQty = useCallback((slug: ProductSlug, qty: number) => {
    const current = cartStore.getSnapshot();
    if (qty < 1) cartStore.set(current.filter((l) => l.slug !== slug));
    else cartStore.set(current.map((l) => (l.slug === slug ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)));
  }, []);

  const remove = useCallback((slug: ProductSlug) => {
    cartStore.set(cartStore.getSnapshot().filter((l) => l.slug !== slug));
  }, []);

  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  return { lines, count, add, setQty, remove };
}

export function useWishlist() {
  const items = useSyncExternalStore(wishlistStore.subscribe, wishlistStore.getSnapshot, wishlistStore.getServerSnapshot);

  const toggle = useCallback((slug: ProductSlug) => {
    const current = wishlistStore.getSnapshot();
    if (current.includes(slug)) wishlistStore.set(current.filter((s) => s !== slug));
    else if (current.length < MAX_WISHLIST) wishlistStore.set([...current, slug]);
  }, []);

  const remove = useCallback((slug: ProductSlug) => {
    wishlistStore.set(wishlistStore.getSnapshot().filter((s) => s !== slug));
  }, []);

  return { items, toggle, remove, has: (slug: ProductSlug) => items.includes(slug) };
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

/** Optional details for the WhatsApp message, stored in this browser only. */
const detailsListeners = new Set<Listener>();
let detailsRaw: string | null | undefined;
let detailsValue: OrderDetailsState = emptyOrderDetails;
let detailsMemory: string | null = null;

function getDetails(): OrderDetailsState {
  const raw = readStorage(STORAGE_KEYS.orderDetails) ?? detailsMemory;
  if (raw !== detailsRaw) {
    detailsRaw = raw;
    detailsValue = parseOrderDetails(raw);
  }
  return detailsValue;
}

export function useOrderDetails() {
  const details = useSyncExternalStore(
    (l) => {
      detailsListeners.add(l);
      return () => detailsListeners.delete(l);
    },
    getDetails,
    () => emptyOrderDetails,
  );
  const update = useCallback((patch: Partial<OrderDetailsState>) => {
    const next = parseOrderDetails(JSON.stringify({ ...getDetails(), ...patch }));
    detailsMemory = JSON.stringify(next);
    writeStorage(STORAGE_KEYS.orderDetails, detailsMemory);
    detailsListeners.forEach((l) => l());
  }, []);
  /** Forgets everything typed on the order page (name, country, notes, gift note) in this browser. */
  const clear = useCallback(() => {
    detailsMemory = JSON.stringify(emptyOrderDetails);
    removeStorage(STORAGE_KEYS.orderDetails);
    detailsListeners.forEach((l) => l());
  }, []);
  return { details, update, clear };
}

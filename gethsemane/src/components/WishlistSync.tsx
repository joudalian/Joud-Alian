"use client";

import { useEffect } from "react";
import { wishlistAccess } from "@/lib/client-store";

/**
 * Keeps a signed-in customer's wishlist in their account (FEATURES.wishlistSync). Rendered only when a session
 * cookie is present. On load, the account's list and this browser's list are merged; after that every change is
 * saved. Renders nothing.
 */
export function WishlistSync() {
  useEffect(() => {
    let last = "";
    let stopped = false;
    const save = (items: string[]) =>
      fetch("/api/wishlist", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }), credentials: "same-origin" }).catch(() => undefined);

    fetch("/api/wishlist", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: string[] }>) : null))
      .then((data) => {
        if (!data || stopped) return;
        const local = wishlistAccess.get();
        const merged = [...new Set([...local, ...data.items])];
        last = JSON.stringify(merged);
        if (merged.length !== local.length) wishlistAccess.set(merged);
        if (merged.length !== data.items.length) void save(merged);
        unsubscribe = wishlistAccess.subscribe(() => {
          const items = wishlistAccess.get();
          const raw = JSON.stringify(items);
          if (raw === last) return;
          last = raw;
          void save(items);
        });
      })
      .catch(() => undefined);
    let unsubscribe = () => {};
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, []);
  return null;
}

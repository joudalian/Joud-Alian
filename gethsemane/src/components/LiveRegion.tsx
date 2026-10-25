"use client";

import { useEffect, useState } from "react";

const EVENT = "gethsemane:announce";

/** Announce a short message to screen readers (order and wishlist changes). */
export function announce(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

/** One polite live region for the whole page. */
export function LiveRegion() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAnnounce = (e: Event) => {
      const text = String((e as CustomEvent).detail ?? "");
      // Clear first so repeating the same message is announced again.
      setMessage("");
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(text), 50);
    };
    window.addEventListener(EVENT, onAnnounce);
    return () => {
      window.removeEventListener(EVENT, onAnnounce);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="live-region">
      {message}
    </div>
  );
}

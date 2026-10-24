"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CURRENCY_COOKIE, type Currency } from "@/lib/currency";
import { STORAGE_KEYS, parseCurrency, readStorage, setCookie, writeStorage } from "@/lib/storage";

type CurrencyContextValue = { currency: Currency; setCurrency: (currency: Currency) => void };

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/**
 * The server reads the (validated) currency cookie, so the first paint already shows the right prices.
 * localStorage keeps a validated copy that restores the choice if the cookie was cleared.
 */
export function CurrencyProvider({
  initialCurrency,
  hasCookie,
  children,
}: {
  initialCurrency: Currency;
  hasCookie: boolean;
  children: ReactNode;
}) {
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency);

  const setCurrency = useCallback((next: Currency) => {
    const safe = parseCurrency(next);
    setCurrencyState(safe);
    setCookie(CURRENCY_COOKIE, safe);
    writeStorage(STORAGE_KEYS.currency, safe);
  }, []);

  useEffect(() => {
    if (hasCookie) {
      writeStorage(STORAGE_KEYS.currency, initialCurrency);
      return;
    }
    const stored = readStorage(STORAGE_KEYS.currency);
    if (stored !== null && parseCurrency(stored) !== initialCurrency) {
      // Restoring a remembered preference after the cookie was cleared is the only case that re-renders prices.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrency(parseCurrency(stored));
    }
  }, [hasCookie, initialCurrency, setCurrency]);

  return <CurrencyContext.Provider value={{ currency, setCurrency }}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const value = useContext(CurrencyContext);
  if (!value) throw new Error("useCurrency must be used inside CurrencyProvider");
  return value;
}

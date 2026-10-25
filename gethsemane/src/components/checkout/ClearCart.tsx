"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/client-store";

/** Empties the order in this browser once the customer is back from the payment page. */
export function ClearCart() {
  useEffect(() => clearCart(), []);
  return null;
}

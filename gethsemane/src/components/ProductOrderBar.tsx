"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { OrderLine, OrderLookup } from "@/lib/order-message";
import { Price } from "./Price";
import { WhatsAppOrderButton } from "./WhatsAppOrder";

/**
 * Sticky "Order only this piece" bar above the bottom navigation on phones. It appears only once the
 * inline order buttons (#order-row) have scrolled above the screen, so it never covers them or the price.
 * (A scroll listener rather than an IntersectionObserver: a jump past the row would not change its
 * intersection state and the bar would never appear.)
 */
export function ProductOrderBar({
  lines,
  lookup,
  name,
  priceUsd,
}: {
  lines: readonly OrderLine[];
  lookup: OrderLookup;
  name: string;
  priceUsd: number;
}) {
  const t = useTranslations("product");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById("order-row");
    if (!target) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setVisible(target.getBoundingClientRect().bottom < 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div className="order-bar" role="region" aria-label={t("orderBar")} data-visible={visible ? "true" : "false"} hidden={!visible}>
      <div className="order-bar-info">
        <span className="order-bar-name">{name}</span>
        <Price usd={priceUsd} />
      </div>
      <WhatsAppOrderButton lines={lines} lookup={lookup} label={t("orderOnlyThis")} className="btn btn-primary" />
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ProductSlug } from "@/lib/catalog";
import { Price } from "./Price";
import { WhatsAppOrderButton } from "./WhatsAppOrder";

/**
 * Sticky "Order on WhatsApp" bar above the bottom navigation on phones. It appears only once the
 * inline order buttons (#order-row) have scrolled above the screen, so it never covers them or the price.
 * (A scroll listener rather than an IntersectionObserver: a jump past the row would not change its
 * intersection state and the bar would never appear.)
 */
export function ProductOrderBar({ slug, name, priceUsd }: { slug: ProductSlug; name: string; priceUsd: number }) {
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
      <WhatsAppOrderButton lines={[{ slug, qty: 1 }]} label={t("orderWhatsApp")} className="btn btn-primary" />
    </div>
  );
}

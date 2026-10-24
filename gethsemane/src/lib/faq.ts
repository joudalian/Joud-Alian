import { getTranslations } from "next-intl/server";
import {
  DAMAGE_REPORT_DAYS,
  DELIVERY_TIME,
  PAYMENT_METHODS,
  PAYMENT_MODE,
  PROCESSING_TIME,
  RETURN_DAYS,
  SHIP_FROM_TEXT,
} from "@/config/store";
import type { Locale } from "@/i18n/locales";

export type FaqItem = { id: string; q: string; a: string };

/** The payment answer used on the FAQ, order and terms pages, following PAYMENT_MODE. */
export function paymentText(t: (key: string, values?: Record<string, string>) => string): string {
  if (PAYMENT_MODE === "link") {
    return PAYMENT_METHODS.length > 0 ? t("a11Link", { methods: PAYMENT_METHODS.join(", ") }) : t("a11LinkNoMethods");
  }
  return t("a11Instructions");
}

/** FAQ groups; answers are built from the same config values as the policy pages. */
export async function faqGroups(locale: Locale) {
  const t = await getTranslations({ locale, namespace: "faq" });
  const products: FaqItem[] = [1, 2, 3, 4, 5].map((n) => ({ id: `q${n}`, q: t(`q${n}`), a: t(`a${n}`) }));
  const ordering: FaqItem[] = [
    { id: "q6", q: t("q6"), a: t("a6") },
    {
      id: "q7",
      q: t("q7"),
      a: t("a7", {
        shipFrom: SHIP_FROM_TEXT[locale],
        processingMin: PROCESSING_TIME.min,
        processingMax: PROCESSING_TIME.max,
        deliveryMin: DELIVERY_TIME.min,
        deliveryMax: DELIVERY_TIME.max,
      }),
    },
    { id: "q8", q: t("q8"), a: t("a8") },
    { id: "q9", q: t("q9"), a: t("a9", { days: RETURN_DAYS }) },
    { id: "q10", q: t("q10"), a: t("a10", { days: DAMAGE_REPORT_DAYS }) },
    { id: "q11", q: t("q11"), a: paymentText(t) },
    { id: "q12", q: t("q12"), a: t("a12") },
  ];
  return [
    { id: "products", title: t("productsTitle"), items: products },
    { id: "ordering", title: t("orderingTitle"), items: ordering },
  ];
}

import "server-only";
import { getTranslations } from "next-intl/server";
import { CONTACT_EMAIL, STORE_NAME } from "@/config/store";
import { countryName } from "@/lib/countries";
import { formatPrice } from "@/lib/currency";
import { siteUrl } from "@/lib/site";
import { getDb } from "../db";
import { orders } from "../db/schema";
import { addOrderEvent, orderByNumber } from "../orders";
import { eq } from "drizzle-orm";
import { emailLocale, renderEmail, type EmailBlock } from "./layout";
import { sendEmail } from "./send";

async function load(orderId: string) {
  const db = await getDb();
  const [row] = await db.select({ number: orders.number }).from(orders).where(eq(orders.id, orderId));
  return row ? orderByNumber(row.number, false) : null;
}

/** Link to the order for its buyer (works without an account). */
export function orderLink(locale: string, number: string, key: string) {
  return `${siteUrl}/${locale}/track-order/${number}?key=${key}`;
}

/** Order confirmation, sent once the payment is confirmed by Stripe (webhook). */
export async function sendOrderConfirmation(orderId: string) {
  const order = await load(orderId);
  if (!order) return false;
  const locale = emailLocale(order.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  const to = await getTranslations({ locale, namespace: "order" });
  const money = (c: number) => formatPrice(c / 100, "USD", locale);
  const subject = t("orderSubject", { store: STORE_NAME, number: order.number });
  const blocks: EmailBlock[] = [
    { kind: "p", text: t("hello", { name: order.shipName }) },
    { kind: "p", text: t("orderIntro") },
    ...(order.testMode ? [{ kind: "small" as const, text: to("testOrder") }] : []),
    {
      kind: "table",
      rows: [
        ...order.items.map((i): [string, string] => [
          `${i.quantity} × ${[i.nameLocalized, i.variantLabel].filter(Boolean).join(" — ")}${i.engraving ? ` (${to("engraving", { text: i.engraving })})` : ""}`,
          money(i.lineTotalCents),
        ]),
        [to("subtotal"), money(order.subtotalCents)],
        ...(order.discountCents ? [[to("discount", { code: order.couponCode ?? "" }), `−${money(order.discountCents)}`] as [string, string]] : []),
        [to("shipping"), money(order.shippingCents)],
        [to("totalUsd"), money(order.totalCents)],
      ],
    },
    {
      kind: "p",
      text: `${to("shipTo")}: ${[order.shipName, order.shipLine1, order.shipLine2, `${order.shipPostalCode} ${order.shipCity}`.trim(), order.shipRegion, countryName(order.shipCountry, locale)].filter(Boolean).join(", ")}`,
    },
    { kind: "button", label: t("viewOrder"), url: orderLink(locale, order.number, order.accessKey) },
    { kind: "small", text: t("questions", { email: CONTACT_EMAIL, number: order.number }) },
  ];
  const { html, text } = await renderEmail(locale, subject, blocks);
  const sent = await sendEmail({ to: order.email, subject, html, text, kind: "order-confirmation", replyTo: CONTACT_EMAIL || undefined });
  const db = await getDb();
  await addOrderEvent(db, order.id, "email", { message: sent ? "Order confirmation sent" : "Order confirmation NOT sent", internal: true });
  return sent;
}

/** "Your order is on its way", with carrier and tracking number (sent from /admin when the order ships). */
export async function sendShippedEmail(orderId: string) {
  const order = await load(orderId);
  if (!order) return false;
  const locale = emailLocale(order.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  const subject = t("shippedSubject", { store: STORE_NAME, number: order.number });
  const blocks: EmailBlock[] = [
    { kind: "p", text: t("hello", { name: order.shipName }) },
    { kind: "p", text: t("shippedIntro", { number: order.number }) },
    {
      kind: "table",
      rows: [
        ...(order.carrier ? [[t("carrier"), order.carrier] as [string, string]] : []),
        ...(order.trackingNumber ? [[t("trackingNumber"), order.trackingNumber] as [string, string]] : []),
      ],
    },
    { kind: "button", label: t("viewOrder"), url: orderLink(locale, order.number, order.accessKey) },
    { kind: "small", text: t("shippedDamage", { email: CONTACT_EMAIL }) },
  ];
  const { html, text } = await renderEmail(locale, subject, blocks);
  const sent = await sendEmail({ to: order.email, subject, html, text, kind: "order-shipped", replyTo: CONTACT_EMAIL || undefined });
  const db = await getDb();
  await addOrderEvent(db, order.id, "email", { message: sent ? "Shipped email sent" : "Shipped email NOT sent", internal: true });
  return sent;
}

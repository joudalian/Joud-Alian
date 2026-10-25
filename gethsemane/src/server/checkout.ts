import "server-only";
import { feature } from "./features";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { STORE_NAME } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { siteUrl } from "@/lib/site";
import type { AddressInput } from "./address";
import { getDb } from "./db";
import { orderItems, orders } from "./db/schema";
import { addOrderEvent, nextOrderNumber } from "./orders";
import { paymentMode } from "./payments";
import type { Quote } from "./pricing";
import { getStripe, stripeLocale } from "./stripe";

export type NewOrder = {
  quote: Quote;
  email: string;
  address: AddressInput;
  giftNote: string | null;
  locale: Locale;
  userId: string | null;
  shippingLabel: string;
};

/**
 * Saves the order (status pending_payment, prices exactly as quoted on the server) and opens a Stripe Checkout
 * Session for it. Returns the URL of Stripe's payment page. The order becomes "paid" only when Stripe's signed
 * webhook says so (src/app/api/stripe/webhook/route.ts), never because the customer reached the success page.
 */
export async function createOrderAndSession(input: NewOrder): Promise<{ url: string; number: string }> {
  const { quote, address } = input;
  if (!quote.lines.length || quote.problems.length || !quote.shippingMethod || !quote.region) throw new Error("Cannot create an order from an invalid quote");
  const db = await getDb();
  const number = await nextOrderNumber(db);
  const accessKey = randomBytes(24).toString("base64url");
  const [order] = await db
    .insert(orders)
    .values({
      number,
      accessKey,
      userId: input.userId,
      email: input.email,
      locale: input.locale,
      status: "pending_payment",
      subtotalCents: quote.subtotalCents,
      discountCents: quote.discountCents,
      shippingCents: quote.shippingCents,
      totalCents: quote.totalCents,
      couponCode: quote.coupon?.code ?? null,
      shipName: address.name,
      shipLine1: address.line1,
      shipLine2: address.line2,
      shipCity: address.city,
      shipRegion: address.region,
      shipPostalCode: address.postalCode,
      shipCountry: address.country,
      shipPhone: address.phone,
      shippingMethod: quote.shippingMethod,
      shippingRegion: quote.region,
      giftNote: input.giftNote,
      testMode: paymentMode() === "test",
    })
    .returning();
  await db.insert(orderItems).values(
    quote.lines.map((l) => ({
      orderId: order!.id,
      productSlug: l.slug,
      sku: l.sku,
      name: l.name,
      nameLocalized: l.nameLocalized,
      variantId: l.variantId,
      variantLabel: l.variantLabel,
      engraving: l.engraving,
      unitPriceCents: l.unitPriceCents,
      quantity: l.quantity,
      lineTotalCents: l.lineTotalCents,
    })),
  );
  await addOrderEvent(db, order!.id, "pending_payment");

  const stripe = getStripe();
  // A discount becomes a one-off Stripe coupon for exactly the amount computed here.
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
  if (quote.discountCents > 0) {
    const coupon = await stripe.coupons.create({
      amount_off: quote.discountCents,
      currency: "usd",
      duration: "once",
      max_redemptions: 1,
      name: quote.coupon?.code ?? "Discount",
      metadata: { orderNumber: number },
    });
    discounts = [{ coupon: coupon.id }];
  }
  const metadata = { orderId: order!.id, orderNumber: number };
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      // Card payments only (a filter on the methods enabled in the Stripe dashboard).
      // Cards only, unless FEATURES.wallets: then Stripe offers the methods enabled in the Dashboard (Apple Pay,
      // Google Pay and cards; turn the wallets on there too). The site itself never shows wallet or card logos.
      ...(feature("wallets") ? {} : { allowed_payment_method_types: ["card"] }),
      line_items: quote.lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: "usd",
          unit_amount: l.unitPriceCents,
          product_data: {
            name: [l.nameLocalized, l.variantLabel].filter(Boolean).join(" — "),
            ...(l.engraving ? { description: `Engraving: “${l.engraving}”` } : {}),
            metadata: { sku: l.sku, slug: l.slug },
          },
        },
      })),
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: input.shippingLabel,
            fixed_amount: { amount: quote.shippingCents, currency: "usd" },
          },
        },
      ],
      ...(discounts ? { discounts } : {}),
      customer_email: input.email,
      client_reference_id: number,
      metadata,
      payment_intent_data: {
        metadata,
        description: `${STORE_NAME} order ${number}`,
        shipping: {
          name: address.name,
          phone: address.phone || undefined,
          address: {
            line1: address.line1,
            line2: address.line2 || undefined,
            city: address.city,
            state: address.region || undefined,
            postal_code: address.postalCode || undefined,
            country: address.country,
          },
        },
      },
      locale: stripeLocale(input.locale),
      // Unpaid sessions close after an hour; the webhook then cancels the order.
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      success_url: `${siteUrl}/${input.locale}/order/${number}/confirmation?key=${accessKey}`,
      cancel_url: `${siteUrl}/${input.locale}/checkout?cancelled=1`,
    },
    { idempotencyKey: `checkout-${order!.id}` },
  );
  await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, order!.id));
  if (!session.url) throw new Error("Stripe returned no checkout URL");
  return { url: session.url, number };
}

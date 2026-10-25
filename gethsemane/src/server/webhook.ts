import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb } from "./db";
import { couponRedemptions, coupons, orderEvents, orders, stripeEvents } from "./db/schema";
import { sendOrderConfirmation } from "./email/order-emails";

type Order = typeof orders.$inferSelect;
type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>["transaction"]>[0]>[0];

async function event(tx: Tx, orderId: string, type: string, message?: string, internal = false) {
  await tx.insert(orderEvents).values({ orderId, type, message: message ?? null, internal, actor: "stripe" });
}

async function orderForSession(tx: Tx, session: Stripe.Checkout.Session): Promise<Order | undefined> {
  const id = session.metadata?.orderId;
  const [order] = id
    ? await tx.select().from(orders).where(eq(orders.id, id))
    : await tx.select().from(orders).where(eq(orders.stripeSessionId, session.id));
  return order;
}

async function orderForPaymentIntent(tx: Tx, intentId: string, metadata?: Stripe.Metadata | null): Promise<Order | undefined> {
  const [order] = metadata?.orderId
    ? await tx.select().from(orders).where(eq(orders.id, metadata.orderId))
    : await tx.select().from(orders).where(eq(orders.stripePaymentIntentId, intentId));
  return order;
}

/** Marks an order paid when Stripe's amount and currency match ours; otherwise leaves it for the owner to check. */
async function markPaid(tx: Tx, order: Order, session: Stripe.Checkout.Session): Promise<boolean> {
  if (!["pending_payment", "cancelled"].includes(order.status)) return false;
  if (session.amount_total !== order.totalCents || session.currency !== "usd") {
    await event(tx, order.id, "amount_mismatch", `Stripe charged ${session.amount_total} ${session.currency}; order total ${order.totalCents} usd`, true);
    return false;
  }
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  await tx.update(orders).set({ status: "paid", paidAt: new Date(), stripePaymentIntentId: intent }).where(eq(orders.id, order.id));
  await event(tx, order.id, "paid");
  if (order.couponCode) {
    const [coupon] = await tx.select().from(coupons).where(eq(coupons.code, order.couponCode));
    if (coupon) {
      const inserted = await tx.insert(couponRedemptions).values({ couponId: coupon.id, orderId: order.id, email: order.email }).onConflictDoNothing().returning();
      if (inserted.length) await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, coupon.id));
    }
  }
  return true;
}

/**
 * Handles one verified Stripe webhook event exactly once: the event id is recorded in stripe_events in the same
 * transaction as its effects, so a retried or duplicated delivery changes nothing.
 */
export async function handleStripeEvent(evt: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  const db = await getDb();
  const paidOrders: string[] = [];
  const result = await db.transaction(async (tx) => {
    const fresh = await tx.insert(stripeEvents).values({ id: evt.id, type: evt.type }).onConflictDoNothing().returning();
    if (!fresh.length) return "duplicate" as const;
    switch (evt.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = evt.data.object;
        const order = await orderForSession(tx, session);
        if (!order) return "ignored" as const;
        if (session.payment_status === "paid" || evt.type === "checkout.session.async_payment_succeeded") {
          if (await markPaid(tx, order, session)) paidOrders.push(order.id);
        } else {
          await event(tx, order.id, "payment_processing", "Waiting for the payment method to confirm", true);
        }
        return "processed" as const;
      }
      case "checkout.session.async_payment_failed": {
        const order = await orderForSession(tx, evt.data.object);
        if (!order) return "ignored" as const;
        await event(tx, order.id, "payment_failed");
        if (order.status === "pending_payment") {
          await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
          await event(tx, order.id, "cancelled");
        }
        return "processed" as const;
      }
      case "checkout.session.expired": {
        const order = await orderForSession(tx, evt.data.object);
        if (!order) return "ignored" as const;
        if (order.status === "pending_payment") {
          await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, order.id));
          await event(tx, order.id, "expired");
        }
        return "processed" as const;
      }
      case "payment_intent.payment_failed": {
        const intent = evt.data.object;
        const order = await orderForPaymentIntent(tx, intent.id, intent.metadata);
        if (!order) return "ignored" as const;
        await event(tx, order.id, "payment_failed", intent.last_payment_error?.code ?? undefined, true);
        return "processed" as const;
      }
      case "charge.refunded": {
        const charge = evt.data.object;
        const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : (charge.payment_intent?.id ?? "");
        const order = await orderForPaymentIntent(tx, intentId, charge.metadata);
        if (!order) return "ignored" as const;
        if (charge.amount_refunded >= charge.amount) {
          await tx.update(orders).set({ status: "refunded" }).where(and(eq(orders.id, order.id), inArray(orders.status, ["paid", "processing", "shipped", "delivered"])));
          await event(tx, order.id, "refunded");
        } else {
          await event(tx, order.id, "partially_refunded", `${charge.amount_refunded} of ${charge.amount} cents`);
        }
        return "processed" as const;
      }
      default:
        return "ignored" as const;
    }
  });
  // Emails go out after the transaction is committed; a failed email never makes Stripe retry the event.
  for (const id of paidOrders) await sendOrderConfirmation(id).catch((e) => console.error("[email] order confirmation failed:", e instanceof Error ? e.message : e));
  return result;
}

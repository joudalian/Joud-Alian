import "server-only";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { getDb } from "./db";
import { addresses, orderEvents, orderItems, orders, reviewRequests, reviews, user, wishlistItems } from "./db/schema";

/** Orders that were paid at some point: kept for accounting after an account is deleted (see DATA_RETENTION_YEARS). */
const ACCOUNTING_STATUSES = ["paid", "processing", "shipped", "delivered", "refunded"] as const;

/**
 * Deletes an account. Removed: the user, sessions, password, addresses, wishlist, reviews and any unpaid orders. Kept: paid
 * orders, which tax and accounting law require us to keep. They are detached from the account and stripped of what
 * accounting does not need (phone number, gift note).
 */
export async function deleteAccountData(userId: string): Promise<void> {
  const db = await getDb();
  const own = await db.select({ id: orders.id, status: orders.status }).from(orders).where(eq(orders.userId, userId));
  const kept = own.filter((o) => (ACCOUNTING_STATUSES as readonly string[]).includes(o.status)).map((o) => o.id);
  const dropped = own.filter((o) => !kept.includes(o.id)).map((o) => o.id);
  if (dropped.length) await db.delete(orders).where(inArray(orders.id, dropped));
  if (kept.length) {
    // Published reviews carry the customer's name: they go with the account.
    await db.delete(reviews).where(inArray(reviews.orderId, kept));
    await db.delete(reviewRequests).where(inArray(reviewRequests.orderId, kept));
    await db
      .update(orders)
      .set({ userId: null, shipPhone: "", giftNote: null, anonymizedAt: new Date() })
      .where(inArray(orders.id, kept));
    for (const id of kept) await db.insert(orderEvents).values({ orderId: id, type: "anonymized", internal: true, actor: "customer" });
  }
  await db.delete(wishlistItems).where(eq(wishlistItems.userId, userId));
  await db.delete(addresses).where(eq(addresses.userId, userId));
  await db.delete(user).where(eq(user.id, userId)); // sessions and accounts cascade
}

/** Everything we hold about a customer, as plain JSON (data export). Internal admin notes are not personal data of the customer and are left out. */
export async function exportAccountData(userId: string) {
  const db = await getDb();
  const [profile] = await db
    .select({ name: user.name, email: user.email, emailVerified: user.emailVerified, language: user.locale, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId));
  const book = await db.select().from(addresses).where(eq(addresses.userId, userId));
  const own = await db.select().from(orders).where(and(eq(orders.userId, userId), notInArray(orders.status, ["pending_payment"])));
  const ids = own.map((o) => o.id);
  const items = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
  const events = ids.length ? await db.select().from(orderEvents).where(and(inArray(orderEvents.orderId, ids), eq(orderEvents.internal, false))) : [];
  const saved = await db.select({ product: wishlistItems.productSlug, addedAt: wishlistItems.createdAt }).from(wishlistItems).where(eq(wishlistItems.userId, userId));
  const written = ids.length
    ? await db
        .select({ product: reviews.productSlug, rating: reviews.rating, text: reviews.body, name: reviews.displayName, status: reviews.status, createdAt: reviews.createdAt })
        .from(reviews)
        .where(inArray(reviews.orderId, ids))
    : [];
  return {
    exportedAt: new Date().toISOString(),
    profile,
    addresses: book.map((a) => ({
      name: a.name,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      region: a.region,
      postalCode: a.postalCode,
      country: a.country,
      phone: a.phone,
      isDefault: a.isDefault,
    })),
    orders: own.map((o) => ({
      number: o.number,
      createdAt: o.createdAt,
      status: o.status,
      email: o.email,
      currency: o.currency,
      subtotalCents: o.subtotalCents,
      discountCents: o.discountCents,
      shippingCents: o.shippingCents,
      totalCents: o.totalCents,
      couponCode: o.couponCode,
      shippingAddress: { name: o.shipName, line1: o.shipLine1, line2: o.shipLine2, city: o.shipCity, region: o.shipRegion, postalCode: o.shipPostalCode, country: o.shipCountry, phone: o.shipPhone },
      shippingMethod: o.shippingMethod,
      giftNote: o.giftNote,
      carrier: o.carrier,
      trackingNumber: o.trackingNumber,
      items: items
        .filter((i) => i.orderId === o.id)
        .map((i) => ({ product: i.productSlug, sku: i.sku, name: i.nameLocalized, variant: i.variantLabel, engraving: i.engraving, unitPriceCents: i.unitPriceCents, quantity: i.quantity })),
      history: events.filter((e) => e.orderId === o.id).map(({ type, message, createdAt }) => ({ type, message, createdAt })),
    })),
    wishlist: saved,
    reviews: written,
  };
}

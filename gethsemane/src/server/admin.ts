import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "./db";
import { bulkEnquiries, coupons, ORDER_STATUSES, orders, type OrderStatus } from "./db/schema";
import { addOrderEvent, orderByNumber } from "./orders";
import { sendShippedEmail } from "./email/order-emails";
import { sendReviewRequest } from "./reviews";

export type OrderFilter = { status?: string; q?: string; test?: "only" | "hide" };

/** Orders for /admin, newest first, at most 200 (filter to find older ones). */
export async function adminOrders(filter: OrderFilter) {
  const db = await getDb();
  const where: SQL[] = [];
  if (filter.status && (ORDER_STATUSES as readonly string[]).includes(filter.status)) where.push(eq(orders.status, filter.status as OrderStatus));
  const q = filter.q?.trim();
  if (q) where.push(or(ilike(orders.number, `%${q}%`), ilike(orders.email, `%${q}%`), ilike(orders.shipName, `%${q}%`))!);
  if (filter.test === "only") where.push(eq(orders.testMode, true));
  if (filter.test === "hide") where.push(eq(orders.testMode, false));
  return db
    .select({
      id: orders.id,
      number: orders.number,
      createdAt: orders.createdAt,
      email: orders.email,
      shipName: orders.shipName,
      shipCountry: orders.shipCountry,
      totalCents: orders.totalCents,
      status: orders.status,
      testMode: orders.testMode,
    })
    .from(orders)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(200);
}

/**
 * Statuses the owner may set by hand. "paid" and "refunded" come only from Stripe (the webhook), so a payment can
 * never be recorded without Stripe confirming it; an unpaid order can only be cancelled.
 */
export function allowedStatuses(current: OrderStatus): OrderStatus[] {
  if (current === "pending_payment") return ["cancelled"];
  if (current === "cancelled" || current === "refunded") return [];
  return (["processing", "shipped", "delivered", "cancelled"] as const).filter((s) => s !== current);
}

export async function setOrderStatus(number: string, status: OrderStatus, actor: string) {
  const order = await orderByNumber(number);
  if (!order) return "not-found" as const;
  if (!allowedStatuses(order.status).includes(status)) return "not-allowed" as const;
  const db = await getDb();
  const now = new Date();
  await db
    .update(orders)
    .set({
      status,
      updatedAt: now,
      ...(status === "shipped" && !order.shippedAt ? { shippedAt: now } : {}),
      ...(status === "delivered" ? { deliveredAt: now } : {}),
    })
    .where(eq(orders.id, order.id));
  await addOrderEvent(db, order.id, status, { actor });
  // FEATURES.reviews: one request to the buyer once the order is delivered (never fails the status change).
  if (status === "delivered") await sendReviewRequest(order.id).catch(() => false);
  return "ok" as const;
}

/** Marks the order shipped with carrier and tracking number, then emails the customer. */
export async function shipOrder(number: string, carrier: string, trackingNumber: string, actor: string, notify: boolean) {
  const order = await orderByNumber(number);
  if (!order) return "not-found" as const;
  if (!["paid", "processing", "shipped"].includes(order.status)) return "not-allowed" as const;
  const db = await getDb();
  const now = new Date();
  await db
    .update(orders)
    .set({ status: "shipped", carrier, trackingNumber, shippedAt: order.shippedAt ?? now, updatedAt: now })
    .where(eq(orders.id, order.id));
  await addOrderEvent(db, order.id, "shipped", { actor });
  await addOrderEvent(db, order.id, "note", { message: `Carrier: ${carrier}; tracking: ${trackingNumber}`, internal: true, actor });
  if (notify) await sendShippedEmail(order.id);
  return "ok" as const;
}

export async function addInternalNote(number: string, note: string, actor: string) {
  const order = await orderByNumber(number);
  if (!order) return "not-found" as const;
  const db = await getDb();
  await addOrderEvent(db, order.id, "note", { message: note, internal: true, actor });
  return "ok" as const;
}

export async function adminCoupons() {
  const db = await getDb();
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export type CouponInput = {
  code: string;
  kind: "percent" | "fixed";
  amount: number;
  minSubtotalCents: number;
  expiresAt: Date | null;
  usageLimit: number | null;
};

export async function createCoupon(input: CouponInput) {
  const db = await getDb();
  const [existing] = await db.select({ id: coupons.id }).from(coupons).where(sql`upper(${coupons.code}) = ${input.code}`);
  if (existing) return "exists" as const;
  await db.insert(coupons).values({ ...input, active: true });
  return "ok" as const;
}

export async function setCouponActive(id: string, active: boolean) {
  const db = await getDb();
  await db.update(coupons).set({ active }).where(eq(coupons.id, id));
}

export async function adminEnquiries() {
  const db = await getDb();
  return db.select().from(bulkEnquiries).orderBy(desc(bulkEnquiries.createdAt)).limit(200);
}

export async function setEnquiryHandled(id: string, handled: boolean) {
  const db = await getDb();
  await db.update(bulkEnquiries).set({ handled }).where(eq(bulkEnquiries.id, id));
}

import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, type Db } from "./db";
import { orderCounters, orderEvents, orderItems, orders, type OrderStatus } from "./db/schema";

export type OrderRow = typeof orders.$inferSelect;
export type OrderItemRow = typeof orderItems.$inferSelect;
export type OrderEventRow = typeof orderEvents.$inferSelect;
export type OrderView = OrderRow & { items: OrderItemRow[]; events: OrderEventRow[] };

/** Order number format GTH-YYMM-0001: a per-month counter, incremented atomically in the database. */
export const ORDER_NUMBER = /^GTH-\d{4}-\d{4,}$/;

export async function nextOrderNumber(db: Db, now = new Date()): Promise<string> {
  const month = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const [row] = await db
    .insert(orderCounters)
    .values({ month, value: 1 })
    .onConflictDoUpdate({ target: orderCounters.month, set: { value: sql`${orderCounters.value} + 1` } })
    .returning({ value: orderCounters.value });
  return `GTH-${month}-${String(row!.value).padStart(4, "0")}`;
}

export function normalizeOrderNumber(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

async function withDetails(db: Db, order: OrderRow, includeInternal: boolean): Promise<OrderView> {
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(orderEvents)
      .where(includeInternal ? eq(orderEvents.orderId, order.id) : and(eq(orderEvents.orderId, order.id), eq(orderEvents.internal, false)))
      .orderBy(asc(orderEvents.createdAt)),
  ]);
  return { ...order, items, events };
}

/** The customer's own orders, newest first (pending payments that were never completed are left out). */
export async function ordersForUser(userId: string) {
  const db = await getDb();
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), sql`${orders.status} <> 'pending_payment'`))
    .orderBy(desc(orders.createdAt));
}

export async function orderForUser(userId: string, number: string): Promise<OrderView | null> {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.number, normalizeOrderNumber(number))));
  return order ? withDetails(db, order, false) : null;
}

/** Guest tracking: the order number and the email used at checkout must both match (case-insensitive email). */
export async function orderForTracking(number: string, email: string): Promise<OrderView | null> {
  const db = await getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.number, normalizeOrderNumber(number)), sql`lower(${orders.email}) = ${email.trim().toLowerCase()}`));
  return order ? withDetails(db, order, false) : null;
}

export async function orderByNumber(number: string, includeInternal = true): Promise<OrderView | null> {
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.number, normalizeOrderNumber(number)));
  return order ? withDetails(db, order, includeInternal) : null;
}

export async function addOrderEvent(db: Db, orderId: string, type: OrderStatus | string, opts: { message?: string; internal?: boolean; actor?: string } = {}) {
  await db.insert(orderEvents).values({ orderId, type, message: opts.message ?? null, internal: opts.internal ?? false, actor: opts.actor ?? "system" });
}

/** An order for whoever holds its link: number plus access key (compared in constant time). */
export async function orderByAccessKey(number: string, key: string): Promise<OrderView | null> {
  if (!key || key.length > 100) return null;
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.number, normalizeOrderNumber(number)));
  if (!order) return null;
  const { timingSafeEqual } = await import("node:crypto");
  const a = Buffer.from(order.accessKey);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b) ? withDetails(db, order, false) : null;
}

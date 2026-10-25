import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { CONTACT_EMAIL, STORE_NAME } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { siteUrl } from "@/lib/site";
import { getDb } from "./db";
import { emailOptOuts, orderItems, orders, reviewRequests, reviews } from "./db/schema";
import { emailLocale, renderEmail } from "./email/layout";
import { sendEmail } from "./email/send";
import { feature } from "./features";
import { addOrderEvent } from "./orders";

/** Reviews are shown (with AggregateRating) only from this many approved reviews of a product. */
export const MIN_REVIEWS_SHOWN = 3;

const reviewUrl = (locale: Locale, token: string, query = "") => `${siteUrl}/${locale}/review/${token}${query}`;

/**
 * One review request per order, sent when the owner marks it delivered (FEATURES.reviews). Never sent to an address
 * that opted out. The link in it is the only way to post a review, so only that order's buyer can.
 */
export async function sendReviewRequest(orderId: string) {
  if (!feature("reviews")) return false;
  const db = await getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || order.anonymizedAt) return false;
  const [optOut] = await db.select().from(emailOptOuts).where(sql`${emailOptOuts.email} = ${order.email.toLowerCase()}`);
  if (optOut) return false;
  const token = randomBytes(24).toString("base64url");
  const [created] = await db.insert(reviewRequests).values({ orderId, token, sentAt: new Date() }).onConflictDoNothing().returning();
  if (!created) return false;
  const locale = emailLocale(order.locale);
  const t = await getTranslations({ locale, namespace: "reviews" });
  const subject = t("requestSubject", { store: STORE_NAME, number: order.number });
  const { html, text } = await renderEmail(
    locale,
    subject,
    [
      { kind: "p", text: t("requestIntro", { number: order.number }) },
      { kind: "button", label: t("requestButton"), url: reviewUrl(locale, token) },
      { kind: "small", text: t("requestOptional") },
    ],
    reviewUrl(locale, token, "?optout=1"),
  );
  const sent = await sendEmail({ to: order.email, subject, html, text, kind: "review-request", replyTo: CONTACT_EMAIL || undefined, headers: { "List-Unsubscribe": `<${reviewUrl(locale, token, "?optout=1")}>` } });
  await addOrderEvent(db, order.id, "email", { message: sent ? "Review request sent" : "Review request NOT sent", internal: true });
  return sent;
}

/** The order behind a review link, its products and which of them were reviewed already. */
export async function reviewContext(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const db = await getDb();
  const [request] = await db.select().from(reviewRequests).where(eq(reviewRequests.token, token));
  if (!request) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, request.orderId));
  if (!order || order.anonymizedAt || order.status !== "delivered") return null;
  const items = await db.select({ slug: orderItems.productSlug, name: orderItems.nameLocalized }).from(orderItems).where(eq(orderItems.orderId, order.id));
  const done = await db.select({ slug: reviews.productSlug }).from(reviews).where(eq(reviews.orderId, order.id));
  const products = [...new Map(items.map((i) => [i.slug, i])).values()];
  return { request, order, products, reviewed: new Set(done.map((d) => d.slug)) };
}

export async function optOutOfReviews(token: string) {
  const context = await reviewContext(token);
  const db = await getDb();
  const [request] = context ? [context.request] : await db.select().from(reviewRequests).where(eq(reviewRequests.token, token));
  if (!request) return false;
  const [order] = await db.select({ email: orders.email }).from(orders).where(eq(orders.id, request.orderId));
  await db.update(reviewRequests).set({ optedOut: true }).where(eq(reviewRequests.orderId, request.orderId));
  if (order) await db.insert(emailOptOuts).values({ email: order.email.toLowerCase(), kind: "reviews" }).onConflictDoNothing();
  return true;
}

export type PublicReview = { id: string; rating: number; body: string; displayName: string; locale: string; hasPhoto: boolean; createdAt: Date };

/** Approved reviews of a product, newest first, with the average; empty below MIN_REVIEWS_SHOWN. */
export async function productReviews(slug: string): Promise<{ reviews: PublicReview[]; average: number } | null> {
  if (!feature("reviews")) return null;
  const db = await getDb();
  const rows = await db
    .select({ id: reviews.id, rating: reviews.rating, body: reviews.body, displayName: reviews.displayName, locale: reviews.locale, photo: sql<boolean>`${reviews.photo} is not null`, createdAt: reviews.createdAt })
    .from(reviews)
    .where(and(eq(reviews.productSlug, slug), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt));
  if (rows.length < MIN_REVIEWS_SHOWN) return null;
  const average = Math.round((rows.reduce((sum, r) => sum + r.rating, 0) / rows.length) * 10) / 10;
  return { reviews: rows.map((r) => ({ ...r, hasPhoto: Boolean(r.photo) })), average };
}

export async function adminReviews(status: "pending" | "approved" | "rejected") {
  const db = await getDb();
  return db
    .select({
      id: reviews.id,
      productSlug: reviews.productSlug,
      rating: reviews.rating,
      body: reviews.body,
      displayName: reviews.displayName,
      status: reviews.status,
      hasPhoto: sql<boolean>`${reviews.photo} is not null`,
      createdAt: reviews.createdAt,
      number: orders.number,
    })
    .from(reviews)
    .innerJoin(orders, eq(orders.id, reviews.orderId))
    .where(eq(reviews.status, status))
    .orderBy(desc(reviews.createdAt))
    .limit(200);
}

export async function setReviewStatus(id: string, status: "approved" | "rejected") {
  const db = await getDb();
  await db.update(reviews).set({ status }).where(eq(reviews.id, id));
}

export async function reviewPhoto(id: string) {
  const db = await getDb();
  const [row] = await db.select({ photo: reviews.photo, status: reviews.status }).from(reviews).where(eq(reviews.id, id));
  return row ?? null;
}

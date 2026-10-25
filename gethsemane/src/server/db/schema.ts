/**
 * Database schema (Drizzle ORM, PostgreSQL). Migrations are generated into drizzle/ with `npm run db:generate` and
 * committed; never edit an applied migration. Money is stored in integer cents (USD).
 *
 * The four auth tables (user, session, account, verification) follow Better Auth's expected shape
 * (src/server/auth.ts). Everything else belongs to the shop.
 */
import { boolean, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* ---------- Auth (Better Auth) ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Site language at sign-up, used for emails. */
  locale: text("locale").notNull().default("en"),
  createdAt: created(),
  updatedAt: updated(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    /** Password hash (argon2id), written by Better Auth. */
    password: text("password"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ---------- Customers ---------- */

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2").notNull().default(""),
    city: text("city").notNull(),
    region: text("region").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    /** ISO 3166-1 alpha-2. */
    country: text("country").notNull(),
    phone: text("phone").notNull().default(""),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/* ---------- Orders ---------- */

export const ORDER_STATUSES = ["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Per-month counter behind the order numbers GTH-YYMM-0001. */
export const orderCounters = pgTable("order_counters", {
  month: text("month").primaryKey(),
  value: integer("value").notNull().default(0),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** GTH-YYMM-0001 */
    number: text("number").notNull().unique(),
    /** Random secret in the customer's order links (confirmation, tracking), like WooCommerce's order key. */
    accessKey: text("access_key").notNull(),
    /** Null for guest orders and after the customer deleted their account. */
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    locale: text("locale").notNull().default("en"),
    status: text("status").$type<OrderStatus>().notNull().default("pending_payment"),
    /** Always USD: the only currency charged. */
    currency: text("currency").notNull().default("USD"),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    couponCode: text("coupon_code"),
    shipName: text("ship_name").notNull(),
    shipLine1: text("ship_line1").notNull(),
    shipLine2: text("ship_line2").notNull().default(""),
    shipCity: text("ship_city").notNull(),
    shipRegion: text("ship_region").notNull().default(""),
    shipPostalCode: text("ship_postal_code").notNull().default(""),
    shipCountry: text("ship_country").notNull(),
    shipPhone: text("ship_phone").notNull().default(""),
    /** Shipping rate id from SHIPPING_RATES and the region it belongs to. */
    shippingMethod: text("shipping_method").notNull(),
    shippingRegion: text("shipping_region").notNull(),
    giftNote: text("gift_note"),
    /** True when paid (or attempted) with Stripe test keys: never fulfilled. */
    testMode: boolean("test_mode").notNull().default(false),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    /** Set when the customer's account was deleted and the order kept only for accounting. */
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_email_idx").on(t.email),
    index("orders_status_idx").on(t.status),
    uniqueIndex("orders_stripe_session_idx").on(t.stripeSessionId),
  ],
);

/** A snapshot of what was bought, at the price charged: catalog changes never alter past orders. */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productSlug: text("product_slug").notNull(),
    sku: text("sku").notNull(),
    /** English name (for the owner) and the name in the customer's language. */
    name: text("name").notNull(),
    nameLocalized: text("name_localized").notNull(),
    variantId: text("variant_id"),
    variantLabel: text("variant_label"),
    engraving: text("engraving"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Status history and notes. `internal` events (admin notes) are never shown to the customer. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** A status, or "note", "email", "payment_failed"… */
    type: text("type").notNull(),
    message: text("message"),
    internal: boolean("internal").notNull().default(false),
    actor: text("actor").notNull().default("system"),
    createdAt: created(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId)],
);

/* ---------- Coupons ---------- */

export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Stored upper-case. */
  code: text("code").notNull().unique(),
  kind: text("kind").$type<"percent" | "fixed">().notNull(),
  /** Percent (1–100) or a fixed amount in USD cents. */
  amount: integer("amount").notNull(),
  minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  /** One use per email address (newsletter welcome codes). */
  singleUsePerEmail: boolean("single_use_per_email").notNull().default(false),
  /** Restricts the code to one email address (e.g. a newsletter welcome code). */
  email: text("email"),
  active: boolean("active").notNull().default(true),
  createdAt: created(),
});

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex("coupon_redemptions_order_idx").on(t.orderId)],
);

/* ---------- Stripe ---------- */

/** Webhook events already handled (idempotency). */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Abuse protection ---------- */

/** Fixed-window counters for rate limiting (src/server/rate-limit.ts). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/* ---------- Forms and engagement (Phase 3–4) ---------- */

export const bulkEnquiries = pgTable("bulk_enquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organisation: text("organisation").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  country: text("country").notNull(),
  items: text("items").notNull(),
  quantity: text("quantity").notNull(),
  neededBy: text("needed_by"),
  message: text("message").notNull().default(""),
  locale: text("locale").notNull().default("en"),
  handled: boolean("handled").notNull().default(false),
  createdAt: created(),
});

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productSlug: text("product_slug").notNull(),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productSlug] })],
);

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productSlug: text("product_slug").notNull(),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    /** First name or initials as the buyer chose to show them. */
    displayName: text("display_name").notNull(),
    locale: text("locale").notNull().default("en"),
    /** Re-encoded WebP photo, stored in the database (small, size-limited). */
    photo: text("photo"),
    status: text("status").$type<(typeof REVIEW_STATUSES)[number]>().notNull().default("pending"),
    createdAt: created(),
  },
  (t) => [uniqueIndex("reviews_order_product_idx").on(t.orderId, t.productSlug), index("reviews_product_idx").on(t.productSlug)],
);

/** One review-request email per order; also stores the buyer's opt-out. */
export const reviewRequests = pgTable("review_requests", {
  orderId: uuid("order_id")
    .primaryKey()
    .references(() => orders.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  optedOut: boolean("opted_out").notNull().default(false),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  locale: text("locale").notNull().default("en"),
  /** Double opt-in: only confirmed addresses receive mail. */
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  /** Token in the confirmation and unsubscribe links. */
  token: text("token").notNull().unique(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  welcomeCouponCode: text("welcome_coupon_code"),
  createdAt: created(),
});

/** Email addresses that opted out of a kind of email (e.g. "reviews"), stored lower-case. */
export const emailOptOuts = pgTable("email_opt_outs", {
  email: text("email").primaryKey(),
  kind: text("kind").notNull(),
  createdAt: created(),
});

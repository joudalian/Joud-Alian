import { and, eq, inArray, notInArray } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { productSlugs } from "@/lib/catalog";
import { MAX_WISHLIST } from "@/lib/storage";
import { currentUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { wishlistItems } from "@/server/db/schema";
import { feature } from "@/server/features";
import { allow } from "@/server/rate-limit";

// The signed-in customer's wishlist (FEATURES.wishlistSync). GET returns it; PUT replaces it with the list the
// browser holds. Only same-origin requests with the session cookie are accepted.
const noStore = { "Cache-Control": "private, no-store" };

async function owner(request: NextRequest) {
  if (!feature("wishlistSync")) return null;
  if (request.method !== "GET" && request.headers.get("sec-fetch-site") !== "same-origin" && request.headers.get("origin") !== request.nextUrl.origin) return null;
  return currentUser();
}

export async function GET(request: NextRequest) {
  const user = await owner(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  const db = await getDb();
  const rows = await db.select({ slug: wishlistItems.productSlug }).from(wishlistItems).where(eq(wishlistItems.userId, user.id));
  return NextResponse.json({ items: rows.map((r) => r.slug).filter((s) => productSlugs.includes(s)) }, { headers: noStore });
}

export async function PUT(request: NextRequest) {
  const user = await owner(request);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  if (!(await allow("account"))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: noStore });
  const body = (await request.json().catch(() => null)) as { items?: unknown } | null;
  if (!body || !Array.isArray(body.items)) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: noStore });
  const items = [...new Set(body.items.filter((s): s is string => typeof s === "string" && productSlugs.includes(s)))].slice(0, MAX_WISHLIST);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx
      .delete(wishlistItems)
      .where(items.length ? and(eq(wishlistItems.userId, user.id), notInArray(wishlistItems.productSlug, items)) : eq(wishlistItems.userId, user.id));
    if (items.length) await tx.insert(wishlistItems).values(items.map((productSlug) => ({ userId: user.id, productSlug }))).onConflictDoNothing();
  });
  const rows = await db.select({ slug: wishlistItems.productSlug }).from(wishlistItems).where(and(eq(wishlistItems.userId, user.id), inArray(wishlistItems.productSlug, items.length ? items : [""])));
  return NextResponse.json({ items: rows.map((r) => r.slug) }, { headers: noStore });
}

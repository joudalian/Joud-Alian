import "server-only";
import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "./db";
import { rateLimits } from "./db/schema";

/**
 * Fixed-window rate limits stored in the database, so they hold across serverless instances. Each rule is checked
 * per client IP and, where an email is involved, per email address too.
 */
export const LIMITS = {
  login: { perIp: [20, 600], perEmail: [8, 900] },
  signup: { perIp: [10, 3600] },
  reset: { perIp: [10, 3600], perEmail: [3, 3600] },
  verify: { perIp: [10, 3600], perEmail: [3, 3600] },
  coupon: { perIp: [20, 600] },
  checkout: { perIp: [15, 600] },
  track: { perIp: [30, 600] },
  contact: { perIp: [5, 3600] },
  bulk: { perIp: [5, 3600] },
  review: { perIp: [10, 3600] },
  newsletter: { perIp: [5, 3600] },
  account: { perIp: [30, 600] },
} as const satisfies Record<string, { perIp: readonly [number, number]; perEmail?: readonly [number, number] }>;
export type LimitedAction = keyof typeof LIMITS;

/**
 * The client's IP. On Vercel `x-forwarded-for` is set by the platform (a client-sent value is overwritten), so its
 * first entry is the real client; elsewhere it falls back to `x-real-ip`.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

async function hit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const db = await getDb();
  const resetAt = new Date(Date.now() + windowSeconds * 1000);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.resetAt} < now() then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${rateLimits.resetAt} < now() then ${resetAt.toISOString()}::timestamptz else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count });
  // Now and then, drop windows that ended long ago.
  if (Math.random() < 0.01) await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date(Date.now() - 86_400_000)));
  return (row?.count ?? 0) <= limit;
}

/** IP addresses and emails are stored only as keyed hashes, and only until their window ends (plus a day at most). */
function pseudonym(value: string): string {
  return createHash("sha256").update(`${process.env.BETTER_AUTH_SECRET ?? ""}:${value}`).digest("base64url").slice(0, 22);
}

/** True when the action may go ahead; false when the caller must refuse (rate limited). */
export async function allow(action: LimitedAction, email?: string): Promise<boolean> {
  const rule: { perIp: readonly [number, number]; perEmail?: readonly [number, number] } = LIMITS[action];
  const okIp = await hit(`${action}:ip:${pseudonym(await clientIp())}`, ...rule.perIp);
  const okEmail = email && rule.perEmail ? await hit(`${action}:email:${pseudonym(email.trim().toLowerCase())}`, ...rule.perEmail) : true;
  return okIp && okEmail;
}

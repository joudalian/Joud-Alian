import { and, isNotNull, isNull } from "drizzle-orm";
import { siteUrl } from "@/lib/site";
import { getDb } from "@/server/db";
import { newsletterSubscribers } from "@/server/db/schema";
import { feature } from "@/server/features";
import { requireAdmin } from "@/server/guards";

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Confirmed, subscribed addresses as CSV for the owner's mailing tool, each with its own unsubscribe link. */
export async function GET() {
  if (!feature("newsletter") || !(await requireAdmin())) return new Response(null, { status: 404 });
  const db = await getDb();
  const rows = await db
    .select()
    .from(newsletterSubscribers)
    .where(and(isNotNull(newsletterSubscribers.confirmedAt), isNull(newsletterSubscribers.unsubscribedAt)));
  const lines = [
    "email,language,confirmed_at,unsubscribe_url",
    ...rows.map((r) => [r.email, r.locale, r.confirmedAt!.toISOString(), `${siteUrl}/${r.locale}/newsletter?unsubscribe=${r.token}`].map(cell).join(",")),
  ];
  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="newsletter-subscribers.csv"', "Cache-Control": "private, no-store" },
  });
}

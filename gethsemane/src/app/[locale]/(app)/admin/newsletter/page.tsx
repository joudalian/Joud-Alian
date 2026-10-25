import { and, isNotNull, isNull, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AdminShell, adminMetadata } from "@/components/admin/AdminShell";
import type { Locale } from "@/i18n/locales";
import { getDb } from "@/server/db";
import { newsletterSubscribers } from "@/server/db/schema";
import { feature } from "@/server/features";
import { requireAdmin } from "@/server/guards";

type Props = { params: Promise<{ locale: Locale }> };

export const metadata = adminMetadata("Newsletter");

export default async function AdminNewsletterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await requireAdmin()) || !feature("newsletter")) notFound();
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(newsletterSubscribers)
    .where(and(isNotNull(newsletterSubscribers.confirmedAt), isNull(newsletterSubscribers.unsubscribedAt)));
  return (
    <AdminShell current="/admin/newsletter" title="Newsletter">
      <p data-testid="admin-subscribers">Confirmed subscribers: {Number(row?.n ?? 0)}</p>
      <p className="note">
        The site collects and confirms subscribers; send the newsletter itself with your email tool. Every newsletter must contain an unsubscribe
        link: use each subscriber&apos;s own link from the CSV (or your tool&apos;s unsubscribe link, and remove those addresses here too).
      </p>
      <p>
        <a href="/api/admin/newsletter" className="btn btn-secondary" download>
          Download subscribers (CSV)
        </a>
      </p>
    </AdminShell>
  );
}

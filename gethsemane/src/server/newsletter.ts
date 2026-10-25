import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { CONTACT_EMAIL, NEWSLETTER_WELCOME_COUPON, STORE_NAME } from "@/config/store";
import type { Locale } from "@/i18n/locales";
import { siteUrl } from "@/lib/site";
import { getDb } from "./db";
import { coupons, newsletterSubscribers } from "./db/schema";
import { renderEmail } from "./email/layout";
import { sendEmail } from "./email/send";
import { welcomeCouponPercent } from "./settings";

const token = () => randomBytes(24).toString("base64url");
const pageUrl = (locale: Locale, query: string) => `${siteUrl}/${locale}/newsletter?${query}`;

async function mail(locale: Locale, to: string, subscriberToken: string, kind: string, subject: string, blocks: Parameters<typeof renderEmail>[2]) {
  const unsubscribe = pageUrl(locale, `unsubscribe=${subscriberToken}`);
  const { html, text } = await renderEmail(locale, subject, blocks, unsubscribe);
  return sendEmail({ to, subject, html, text, kind, replyTo: CONTACT_EMAIL || undefined, headers: { "List-Unsubscribe": `<${unsubscribe}>` } });
}

/**
 * Double opt-in, step 1: store the address (unconfirmed) and email a confirmation link. An address that is already
 * confirmed gets nothing, and the visitor sees the same answer either way (no way to test who is subscribed).
 */
export async function subscribe(email: string, locale: Locale) {
  const db = await getDb();
  const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
  if (existing?.confirmedAt && !existing.unsubscribedAt) return;
  const subscriberToken = existing?.token ?? token();
  if (existing) await db.update(newsletterSubscribers).set({ locale, unsubscribedAt: null, confirmedAt: null }).where(eq(newsletterSubscribers.id, existing.id));
  else await db.insert(newsletterSubscribers).values({ email, locale, token: subscriberToken });
  const t = await getTranslations({ locale, namespace: "newsletter" });
  const subject = t("confirmSubject", { store: STORE_NAME });
  await mail(locale, email, subscriberToken, "newsletter-confirm", subject, [
    { kind: "p", text: t("confirmIntro") },
    { kind: "button", label: t("confirmButton"), url: pageUrl(locale, `confirm=${subscriberToken}`) },
    { kind: "small", text: t("confirmIgnore") },
  ]);
}

export async function subscriberByToken(value: string) {
  if (!/^[\w-]{20,64}$/.test(value)) return null;
  const db = await getDb();
  const [row] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.token, value));
  return row ?? null;
}

/** Double opt-in, step 2 (a button press, not the link itself, so mail scanners cannot confirm). */
export async function confirm(value: string) {
  const sub = await subscriberByToken(value);
  if (!sub || sub.unsubscribedAt) return false;
  if (sub.confirmedAt) return true;
  const db = await getDb();
  await db.update(newsletterSubscribers).set({ confirmedAt: new Date() }).where(eq(newsletterSubscribers.id, sub.id));
  const locale = sub.locale as Locale;
  const t = await getTranslations({ locale, namespace: "newsletter" });
  const percent = welcomeCouponPercent();
  let code: string | null = null;
  if (percent > 0 && !sub.welcomeCouponCode) {
    // One code per address, for that address only, usable once.
    code = `WELCOME-${randomBytes(4).toString("hex").toUpperCase()}`;
    await db.insert(coupons).values({
      code,
      kind: "percent",
      amount: percent,
      email: sub.email,
      usageLimit: 1,
      singleUsePerEmail: true,
      expiresAt: new Date(Date.now() + NEWSLETTER_WELCOME_COUPON.validDays * 86_400_000),
    });
    await db.update(newsletterSubscribers).set({ welcomeCouponCode: code }).where(eq(newsletterSubscribers.id, sub.id));
  }
  const subject = t("welcomeSubject", { store: STORE_NAME });
  await mail(locale, sub.email, sub.token, "newsletter-welcome", subject, [
    { kind: "p", text: t("welcomeIntro") },
    ...(code ? [{ kind: "p" as const, text: t("welcomeCode", { code, percent, days: NEWSLETTER_WELCOME_COUPON.validDays }) }] : []),
  ]);
  return true;
}

export async function unsubscribe(value: string) {
  const sub = await subscriberByToken(value);
  if (!sub) return false;
  const db = await getDb();
  await db.update(newsletterSubscribers).set({ unsubscribedAt: new Date() }).where(eq(newsletterSubscribers.id, sub.id));
  return true;
}

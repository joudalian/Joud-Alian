"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isLocale, type Locale } from "@/i18n/locales";
import { backendStatus } from "@/server/db";
import { feature } from "@/server/features";
import { confirm, subscribe, unsubscribe } from "@/server/newsletter";
import { allow } from "@/server/rate-limit";

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const localeOf = (data: FormData): Locale => {
  const l = str(data, "locale");
  return isLocale(l) ? l : "en";
};

// Plain form posts (no script needed); each answers with a redirect to /newsletter?status=…

export async function subscribeNewsletter(data: FormData): Promise<void> {
  const locale = localeOf(data);
  if (!feature("newsletter") || backendStatus()) redirect(`/${locale}/newsletter?status=unavailable`);
  if (str(data, "website")) redirect(`/${locale}/newsletter?status=check`); // honeypot
  const email = z.string().trim().toLowerCase().email().max(254).safeParse(str(data, "email"));
  if (!email.success) redirect(`/${locale}/newsletter?status=invalid`);
  if (!(await allow("newsletter", email.data))) redirect(`/${locale}/newsletter?status=busy`);
  await subscribe(email.data, locale);
  redirect(`/${locale}/newsletter?status=check`);
}

export async function confirmNewsletter(data: FormData): Promise<void> {
  const locale = localeOf(data);
  const ok = feature("newsletter") && (await confirm(str(data, "token")));
  redirect(`/${locale}/newsletter?status=${ok ? "confirmed" : "invalid-link"}`);
}

/** Unsubscribing works even if the newsletter feature was turned off since. */
export async function unsubscribeNewsletter(data: FormData): Promise<void> {
  const locale = localeOf(data);
  const ok = await unsubscribe(str(data, "token"));
  redirect(`/${locale}/newsletter?status=${ok ? "unsubscribed" : "invalid-link"}`);
}

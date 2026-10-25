"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { FormState } from "@/components/forms/ActionForm";
import { CONTACT_EMAIL, STORE_NAME } from "@/config/store";
import { isLocale, type Locale } from "@/i18n/locales";
import { COUNTRY_CODES, countryName } from "@/lib/countries";
import { backendStatus, getDb } from "@/server/db";
import { bulkEnquiries } from "@/server/db/schema";
import { sendEmail } from "@/server/email/send";
import { feature } from "@/server/features";
import { allow } from "@/server/rate-limit";

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const schema = z.object({
  organisation: z.string().min(1).max(150),
  name: z.string().min(1).max(100),
  email: z.string().toLowerCase().email().max(254),
  country: z.enum(COUNTRY_CODES as unknown as [string, ...string[]]),
  items: z.string().min(3).max(2000),
  quantity: z.string().min(1).max(100),
  neededBy: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  message: z.string().max(5000),
});

/** Bulk-order enquiry: stored for /admin and emailed to CONTACT_EMAIL (Reply-To the visitor). No prices here. */
export async function sendBulkEnquiry(_: FormState, data: FormData): Promise<FormState> {
  const raw = str(data, "locale");
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = await getTranslations({ locale, namespace: "bulk" });
  if (!feature("bulkOrders")) return { status: "error", message: t("failed", { email: CONTACT_EMAIL }) };
  if (str(data, "website")) return { status: "success", message: t("sent") }; // honeypot
  const parsed = schema.safeParse({
    organisation: str(data, "organisation"),
    name: str(data, "name"),
    email: str(data, "email"),
    country: str(data, "country"),
    items: str(data, "items"),
    quantity: str(data, "quantity"),
    neededBy: str(data, "neededBy"),
    message: str(data, "message"),
  });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    return { status: "error", message: t.has(`invalid.${field}`) ? t(`invalid.${field}`) : t("check") };
  }
  if (backendStatus()) return { status: "error", message: t("failed", { email: CONTACT_EMAIL }) };
  if (!(await allow("bulk"))) return { status: "error", message: t("tooMany", { email: CONTACT_EMAIL }) };
  const e = parsed.data;
  const db = await getDb();
  await db.insert(bulkEnquiries).values({ ...e, neededBy: e.neededBy || null, locale });
  const rows: [string, string][] = [
    ["Organisation", e.organisation],
    ["Name", e.name],
    ["Email", e.email],
    ["Country", countryName(e.country, "en")],
    ["Pieces", e.items],
    ["Quantity", e.quantity],
    ["Needed by", e.neededBy || "—"],
    ["Site language", locale],
  ];
  if (CONTACT_EMAIL) {
    await sendEmail({
      to: CONTACT_EMAIL,
      subject: `[${STORE_NAME}] Bulk order enquiry — ${e.organisation} (${e.country})`,
      text: `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${e.message}\n\nAlso listed in /admin/enquiries.\n`,
      html: `<table>${rows.map(([k, v]) => `<tr><th align="left">${k}</th><td style="white-space:pre-wrap">${escape(v)}</td></tr>`).join("")}</table><p style="white-space:pre-wrap">${escape(e.message)}</p>`,
      replyTo: e.email,
      kind: "bulk-enquiry",
    });
  }
  return { status: "success", message: t("sent") };
}

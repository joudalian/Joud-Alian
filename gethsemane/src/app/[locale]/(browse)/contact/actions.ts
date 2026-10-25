"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";
import type { FormState } from "@/components/forms/ActionForm";
import { CONTACT_EMAIL, STORE_NAME } from "@/config/store";
import { isLocale, type Locale } from "@/i18n/locales";
import { contactSubjects, contactTopics } from "@/lib/contact";
import { sendEmail } from "@/server/email/send";
import { allow } from "@/server/rate-limit";

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const schema = z.object({
  topic: z.enum(contactTopics),
  name: z.string().min(1).max(100),
  email: z.string().toLowerCase().email().max(254),
  order: z.string().max(40),
  message: z.string().min(10).max(5000),
});

/** Contact form: one email to CONTACT_EMAIL, with Reply-To set to the visitor. Nothing is stored. */
export async function sendContact(_: FormState, data: FormData): Promise<FormState> {
  const raw = str(data, "locale");
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = await getTranslations({ locale, namespace: "contact" });
  // Honeypot: bots fill every field; they get the normal success message and nothing is sent.
  if (str(data, "website")) return { status: "success", message: t("formSent") };
  const parsed = schema.safeParse({
    topic: str(data, "topic") || "other",
    name: str(data, "name"),
    email: str(data, "email"),
    order: str(data, "order").toUpperCase(),
    message: str(data, "message"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const key = field === "name" ? "formNameRequired" : field === "email" ? "formEmailInvalid" : field === "message" ? "formMessageLength" : "formCheck";
    return { status: "error", message: t(key) };
  }
  if (!CONTACT_EMAIL) return { status: "error", message: t("formFailed", { email: "" }) };
  if (!(await allow("contact"))) return { status: "error", message: t("formTooMany", { email: CONTACT_EMAIL }) };
  const m = parsed.data;
  // English subject and labels for the owner; the visitor's own words are passed through unchanged.
  const subject = `[${STORE_NAME}] ${contactSubjects[m.topic]}${m.order ? ` — ${m.order}` : ""} — ${m.name}`;
  const rows: [string, string][] = [
    ["Topic", contactSubjects[m.topic]],
    ["Name", m.name],
    ["Email", m.email],
    ["Order number", m.order || "—"],
    ["Site language", locale],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${m.message}\n`;
  const html = `<table>${rows.map(([k, v]) => `<tr><th align="left">${k}</th><td>${escape(v)}</td></tr>`).join("")}</table><p style="white-space:pre-wrap">${escape(m.message)}</p>`;
  const sent = await sendEmail({ to: CONTACT_EMAIL, subject, html, text, replyTo: m.email, kind: "contact" });
  return sent ? { status: "success", message: t("formSent") } : { status: "error", message: t("formFailed", { email: CONTACT_EMAIL }) };
}

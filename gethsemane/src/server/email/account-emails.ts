import "server-only";
import { getTranslations } from "next-intl/server";
import { STORE_NAME } from "@/config/store";
import { renderEmail, emailLocale } from "./layout";
import { sendEmail } from "./send";

type Recipient = { email: string; name: string; locale?: unknown };

export async function sendVerificationEmail(user: Recipient, url: string) {
  const locale = emailLocale(user.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  const subject = t("verifySubject", { store: STORE_NAME });
  const { html, text } = await renderEmail(locale, subject, [
    { kind: "p", text: t("hello", { name: user.name }) },
    { kind: "p", text: t("verifyIntro") },
    { kind: "button", label: t("verifyButton"), url },
    { kind: "small", text: t("verifyIgnore") },
  ]);
  return sendEmail({ to: user.email, subject, html, text, kind: "verify-email" });
}

export async function sendPasswordResetEmail(user: Recipient, url: string) {
  const locale = emailLocale(user.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  const subject = t("resetSubject", { store: STORE_NAME });
  const { html, text } = await renderEmail(locale, subject, [
    { kind: "p", text: t("hello", { name: user.name }) },
    { kind: "p", text: t("resetIntro") },
    { kind: "button", label: t("resetButton"), url },
    { kind: "small", text: t("resetIgnore") },
  ]);
  return sendEmail({ to: user.email, subject, html, text, kind: "reset-password" });
}

/** Sent instead of an error when someone signs up with an address that already has an account (no enumeration). */
export async function sendExistingAccountEmail(user: Recipient, loginUrl: string, resetUrl: string) {
  const locale = emailLocale(user.locale);
  const t = await getTranslations({ locale, namespace: "email" });
  const subject = t("existingSubject", { store: STORE_NAME });
  const { html, text } = await renderEmail(locale, subject, [
    { kind: "p", text: t("hello", { name: user.name }) },
    { kind: "p", text: t("existingIntro") },
    { kind: "button", label: t("existingLogin"), url: loginUrl },
    { kind: "small", text: t("existingReset", { url: resetUrl }) },
  ]);
  return sendEmail({ to: user.email, subject, html, text, kind: "existing-account" });
}

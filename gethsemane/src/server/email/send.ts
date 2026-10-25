import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** For logs and tests only, e.g. "verify-email". */
  kind: string;
};

/**
 * Sends one email. Provider-agnostic: today Resend (RESEND_API_KEY + EMAIL_FROM), called over plain HTTPS.
 * Without a key the email is written to EMAIL_OUTBOX_FILE (tests) or logged (development; in production only the
 * recipient and subject are logged, never the body, which can contain links with tokens).
 * Never throws: a failed email must never break sign-up or checkout. Returns whether it was handed over.
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  try {
    const outbox = process.env.EMAIL_OUTBOX_FILE;
    if (outbox) {
      await mkdir(dirname(outbox), { recursive: true });
      await appendFile(outbox, `${JSON.stringify({ ...email, at: new Date().toISOString() })}\n`);
      return true;
    }
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from) {
      if (process.env.NODE_ENV === "production") {
        // eslint-disable-next-line no-console -- intentional: tells the owner email is not configured (no body logged)
        console.warn(`[email] not sent (RESEND_API_KEY/EMAIL_FROM unset): ${email.kind} to ${email.to}`);
      } else {
        // eslint-disable-next-line no-console -- intentional: development mail log, so links can be opened locally
        console.info(`[email] ${email.kind} to ${email.to}: ${email.subject}\n${email.text}`);
      }
      return false;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(`[email] provider refused ${email.kind} (${response.status})`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[email] failed to send ${email.kind}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

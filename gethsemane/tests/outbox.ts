// Emails the test servers "sent": scripts/test-server.mjs points EMAIL_OUTBOX_FILE at .data/test-outbox-<port>.jsonl.
import { expect, type BrowserContext } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

export type SentEmail = { to: string; subject: string; html: string; text: string; kind: string; at: string };
const file = (port: number) => new URL(`../.data/test-outbox-${port}.jsonl`, import.meta.url);

export function sentEmails(to?: string, kind?: string, port = 3100): SentEmail[] {
  const FILE = file(port);
  if (!existsSync(FILE)) return [];
  return readFileSync(FILE, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as SentEmail)
    .filter((e) => (!to || e.to === to) && (!kind || e.kind === kind));
}

/** Waits for an email and returns it (the newest matching one). */
export async function waitForEmail(to: string, kind: string, port = 3100): Promise<SentEmail> {
  await expect.poll(() => sentEmails(to, kind, port).length, { timeout: 15_000 }).toBeGreaterThan(0);
  return sentEmails(to, kind, port).at(-1)!;
}

/** The first http(s) link of an email's plain text that contains `part`. */
export function linkIn(email: SentEmail, part: string): string {
  const url = email.text.match(/https?:\/\/\S+/g)?.find((u) => u.includes(part));
  if (!url) throw new Error(`No link containing "${part}" in ${email.kind} email`);
  return url;
}

/** A unique email address and client IP per test, so tests never share accounts or rate-limit windows. */
export function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}
export async function useOwnIp(context: BrowserContext) {
  const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
  await context.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  return ip;
}

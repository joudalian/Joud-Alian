import { CONTACT_EMAIL } from "@/config/store";
import { defaultLocale } from "@/i18n/locales";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

/** RFC 9116 security.txt. Contact comes from the store config (email if set, otherwise the contact page). */
export function GET() {
  // One year after the build (BUILD_TIME is set in next.config.ts), so every deployment renews it.
  const expires = new Date(process.env.BUILD_TIME ?? Date.now());
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  const lines = [
    ...(CONTACT_EMAIL ? [`Contact: mailto:${CONTACT_EMAIL}`] : []),
    `Contact: ${siteUrl}/${defaultLocale}/contact`,
    `Expires: ${expires.toISOString()}`,
    `Preferred-Languages: en`,
    `Canonical: ${siteUrl}/.well-known/security.txt`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

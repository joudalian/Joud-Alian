import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/locales";
import { socialLinks } from "@/lib/social";

/**
 * A sentence with our social accounts as links, e.g. "Follow the workshop on Instagram, TikTok and Facebook."
 * The networks are joined as a list in the page language; nothing renders when no account is set.
 */
export async function SocialSentence({ messageKey, className }: { messageKey: "about.follow"; className?: string }) {
  const links = socialLinks();
  if (links.length === 0) return null;
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const marker = "\u0000";
  const [before, after] = t(messageKey, { networks: marker }).split(marker);
  const parts = new Intl.ListFormat(locale === "en" ? "en-GB" : locale, { type: "conjunction" }).formatToParts(links.map((l) => l.network));
  const newTab = t("social.newTab");
  return (
    <p className={className} data-testid="social-sentence">
      {before}
      {parts.map((part, i) => {
        const link = links.find((l) => l.network === part.value);
        return part.type === "element" && link ? (
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
            {link.name}
            <span className="sr-only"> ({newTab})</span>
          </a>
        ) : (
          <Fragment key={i}>{part.value}</Fragment>
        );
      })}
      {after}
    </p>
  );
}

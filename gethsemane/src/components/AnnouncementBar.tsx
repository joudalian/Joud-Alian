import { getLocale, getTranslations } from "next-intl/server";
import { ANNOUNCEMENT } from "@/config/store";
import type { Locale } from "@/i18n/locales";

/** Optional bar above the header; off unless ANNOUNCEMENT.enabled and a text exists (falls back to English). */
export async function AnnouncementBar() {
  if (!ANNOUNCEMENT.enabled) return null;
  const locale = (await getLocale()) as Locale;
  const text = ANNOUNCEMENT.text[locale] || ANNOUNCEMENT.text.en;
  if (!text) return null;
  const t = await getTranslations("announcement");
  return (
    <aside className="announcement" aria-label={t("label")}>
      <p className="container">{text}</p>
    </aside>
  );
}

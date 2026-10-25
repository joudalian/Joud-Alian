import { DUTIES_NOTE_BY_REGION } from "@/config/store";
import type { Locale } from "@/i18n/locales";

/** The confirmed import-duties note for a shipping region, in the page language (English fallback), or null. */
export function dutiesNoteFor(region: string | null, locale: Locale, notes: Partial<Record<string, Partial<Record<string, string>>>> = DUTIES_NOTE_BY_REGION): string | null {
  if (!region) return null;
  const text = notes[region];
  return text?.[locale]?.trim() || text?.en?.trim() || null;
}

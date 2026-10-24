import { WHATSAPP_NUMBER } from "@/config/store";

/** Longest prefilled text (after URL encoding) we put in a wa.me link; longer links fail in some apps. */
export const MAX_ENCODED_MESSAGE = 2000;

/** Replaces lone UTF-16 surrogates (which make encodeURIComponent throw) with U+FFFD. */
export function wellFormed(text: string): string {
  return text.toWellFormed?.() ?? text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�");
}

export function encodeMessage(text: string): string {
  return encodeURIComponent(wellFormed(text));
}

/** Link that opens a WhatsApp chat with the store, with `text` already typed in. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeMessage(text)}`;
}

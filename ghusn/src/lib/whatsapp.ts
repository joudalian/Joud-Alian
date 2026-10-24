import { WHATSAPP_NUMBER } from "@/config/store";

/** Link that opens a WhatsApp chat with the store, with `text` already typed in. */
export function whatsappUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

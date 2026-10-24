import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { whatsappUrl } from "@/lib/whatsapp";
import { ChatIcon } from "./Icons";

/** A link that opens WhatsApp with `message` already typed in (opens in a new tab). */
export async function WhatsAppLink({ message, className = "btn btn-primary", children }: { message: string; className?: string; children: ReactNode }) {
  const t = await getTranslations("whatsapp");
  return (
    <a className={className} href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">
      <ChatIcon size={18} />
      {children}
      <span className="sr-only"> ({t("newTab")})</span>
    </a>
  );
}

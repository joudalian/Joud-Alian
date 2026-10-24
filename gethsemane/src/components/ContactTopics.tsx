"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { STORE_NAME } from "@/config/store";
import { contactSubjects, contactTopics, type ContactTopic } from "@/lib/contact";
import { whatsappUrl } from "@/lib/whatsapp";
import { ChatIcon } from "./Icons";

const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/** Topic chips (a radio group) that change the message prefilled in the WhatsApp link. */
export function ContactTopics({ initial }: { initial: ContactTopic }) {
  const t = useTranslations();
  const [topic, setTopic] = useState<ContactTopic>(initial);
  const name = useId();
  const message = `Subject: ${contactSubjects[topic]}\n${t(`contact.msg${cap(topic)}`, { store: STORE_NAME })}`;
  return (
    <div className="contact-topics">
      <fieldset className="chip-group">
        <legend>{t("contact.topicLabel")}</legend>
        {contactTopics.map((value) => (
          <label key={value} className="chip">
            <input type="radio" name={name} value={value} checked={topic === value} onChange={() => setTopic(value)} />
            <span>{t(`contact.topic${cap(value)}`)}</span>
          </label>
        ))}
      </fieldset>
      <a className="btn btn-primary btn-lg" href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer" data-testid="contact-whatsapp">
        <ChatIcon size={20} />
        {t("whatsapp.chat")}
        <span className="sr-only"> ({t("whatsapp.newTab")})</span>
      </a>
    </div>
  );
}

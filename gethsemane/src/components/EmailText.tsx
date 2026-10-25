import { CONTACT_EMAIL } from "@/config/store";

/** Renders `text` with every occurrence of the store email turned into a mailto: link. */
export function EmailText({ text, subject }: { text: string; subject?: string }) {
  if (!CONTACT_EMAIL || !text.includes(CONTACT_EMAIL)) return <>{text}</>;
  const href = `mailto:${CONTACT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return (
    <>
      {text.split(CONTACT_EMAIL).flatMap((part, i) =>
        i === 0
          ? [part]
          : [
              <a key={i} href={href} className="email-link">
                {CONTACT_EMAIL}
              </a>,
              part,
            ],
      )}
    </>
  );
}

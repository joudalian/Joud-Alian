import "server-only";
import { getTranslations } from "next-intl/server";
import { ADDRESS, CONTACT_EMAIL, STORE_NAME } from "@/config/store";
import { isLocale, type Locale } from "@/i18n/locales";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type EmailBlock =
  | { kind: "p"; text: string }
  | { kind: "button"; label: string; url: string }
  | { kind: "table"; rows: [string, string][] }
  | { kind: "small"; text: string };

export function emailLocale(value: unknown): Locale {
  return isLocale(value) ? value : "en";
}

/**
 * The branded email frame (olive header, cream body, footer with the store address and contact email), as HTML with
 * inline styles and as plain text. Every string passed in is escaped.
 */
export async function renderEmail(locale: Locale, title: string, blocks: EmailBlock[]): Promise<{ html: string; text: string }> {
  const t = await getTranslations({ locale, namespace: "email" });
  const footer = t("footer", { store: STORE_NAME, address: ADDRESS, email: CONTACT_EMAIL });
  const html = blocks
    .map((b) => {
      if (b.kind === "p") return `<p style="margin:0 0 16px;line-height:1.55">${esc(b.text)}</p>`;
      if (b.kind === "small") return `<p style="margin:0 0 12px;font-size:13px;color:#5f4c3b;line-height:1.5">${esc(b.text)}</p>`;
      if (b.kind === "button")
        return `<p style="margin:24px 0"><a href="${esc(b.url)}" style="display:inline-block;background:#4f5e27;color:#f6efdf;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${esc(b.label)}</a></p><p style="margin:0 0 16px;font-size:13px;color:#5f4c3b">${esc(t("linkFallback"))}<br><span style="word-break:break-all">${esc(b.url)}</span></p>`;
      return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px">${b.rows
        .map(([k, v]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #dccdb2">${esc(k)}</td><td style="padding:6px 0;border-bottom:1px solid #dccdb2;text-align:right">${esc(v)}</td></tr>`)
        .join("")}</table>`;
    })
    .join("");
  const document = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f6efdf;color:#4a3222;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
<div style="background:#2a3519;color:#f6efdf;padding:16px 20px;border-radius:12px 12px 0 0;font-family:Georgia,serif;font-size:20px;letter-spacing:.12em">${esc(STORE_NAME.toUpperCase())}</div>
<div style="background:#fdf9f1;padding:24px 20px;border:1px solid #dccdb2;border-top:0;border-radius:0 0 12px 12px">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 16px;color:#2a3519">${esc(title)}</h1>
${html}
</div>
<p style="font-size:12px;color:#5f4c3b;line-height:1.5;margin:16px 4px">${esc(footer)}</p>
</div></body></html>`;
  const text = [
    title,
    "",
    ...blocks.map((b) =>
      b.kind === "button" ? `${b.label}: ${b.url}\n` : b.kind === "table" ? `${b.rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n` : `${b.text}\n`,
    ),
    "—",
    footer,
  ].join("\n");
  return { html: document, text };
}

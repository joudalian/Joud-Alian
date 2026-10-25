/**
 * Structured data for search engines. React renders <script> children as raw text (only "</script" is
 * escaped), and "<" is escaped here as well, so no dangerouslySetInnerHTML is needed. JSON-LD is not
 * executed by the browser, so the CSP is unaffected.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  return <script type="application/ld+json">{json}</script>;
}

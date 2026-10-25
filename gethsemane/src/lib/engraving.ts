/**
 * Characters the workshop can engrave: Latin (with accents), Greek and Cyrillic letters, digits, spaces and common
 * punctuation. Checked in the browser (a message before ordering) and again on the server (pricing).
 */
const ALLOWED = /^[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{M}\p{Nd}\p{Zs}.,'’‘"“”«»„!?&:;()\-–—+#/·]*$/u;

export function engravingSupported(text: string): boolean {
  return ALLOWED.test(text);
}

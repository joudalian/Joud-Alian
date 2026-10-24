// Verifies WCAG 2.1 AA contrast for every text/background pair used by the design tokens.
// Normal text needs 4.5:1; large text (24px+, or 18.66px+ bold) and UI components need 3:1.
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const tokens = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
const color = (v) => (v.startsWith("#") ? v : tokens[v]);

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [foreground, background, minimum, where]
const pairs = [
  ["ink", "cream", 4.5, "body text (walnut on cream)"],
  ["ink", "surface", 4.5, "cards"],
  ["ink", "linen", 4.5, "hovered items"],
  ["ink-muted", "cream", 4.5, "secondary text"],
  ["ink-muted", "surface", 4.5, "secondary text on cards"],
  ["ink-muted", "linen", 4.5, "secondary text on hover"],
  ["olive-700", "cream", 4.5, "links, prices"],
  ["olive-700", "surface", 4.5, "prices on cards"],
  ["olive-700", "olive-100", 4.5, "active language"],
  ["white", "olive-700", 4.5, "primary button, badges"],
  ["white", "olive-900", 4.5, "primary button hover"],
  ["gold-text", "cream", 4.5, "eyebrow, tagline (gold on cream)"],
  ["gold-text", "surface", 4.5, "gold on cards"],
  ["gold-300", "olive-950", 4.5, "eyebrow on hero, footer headings"],
  ["gold-300", "olive-900", 4.5, "eyebrow on story section"],
  ["on-dark", "olive-900", 4.5, "language button, story headings"],
  ["on-dark", "olive-950", 4.5, "hero heading, footer links"],
  ["on-dark-muted", "olive-900", 4.5, "story text"],
  ["on-dark-muted", "olive-950", 4.5, "hero and footer text"],
  ["on-dark-subtle", "olive-950", 4.5, "footer small print"],
  ["olive-900", "cream", 4.5, "light button"],
  ["danger", "cream", 4.5, "remove links"],
  ["danger", "surface", 4.5, "wishlist heart (active)"],
  ["disabled", "surface", 3, "disabled stepper (UI)"],
  ["focus", "cream", 3, "focus ring"],
  ["gold-500", "olive-900", 3, "language button border (UI)"],
  ["gold-300", "olive-950", 3, "focus ring on dark (UI)"],
];

let failed = 0;
for (const [fg, bg, min, where] of pairs) {
  const [a, b] = [color(fg), color(bg)];
  if (!a || !b) {
    console.error(`Unknown token in pair ${fg} / ${bg}`);
    failed++;
    continue;
  }
  const r = ratio(a, b);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)}:1 (min ${min})  ${fg} on ${bg}  — ${where}`);
}
// Soft gold (--gold-500) is decorative only: it is never used for text on light backgrounds.
console.log(`gold-500 on cream would be ${ratio(tokens["gold-500"], tokens.cream).toFixed(2)}:1, so gold text on cream uses --gold-text instead.`);
if (failed) {
  console.error(`${failed} contrast pair(s) below WCAG AA.`);
  process.exit(1);
}

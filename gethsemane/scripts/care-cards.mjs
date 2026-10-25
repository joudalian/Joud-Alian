// Builds the printable olive-wood care cards, one PDF per language, into public/care-card/ (committed, so the site
// serves static files and the runtime needs no PDF code). Run after changing the "care" texts in messages/:
//   npm run care-cards
// Text comes from messages/<locale>.json ("care" namespace). Fonts: DejaVu Sans and DejaVu Serif (free licence,
// Latin, Greek and Cyrillic), embedded as subsets; set CARE_CARD_FONTS to their folder if they are elsewhere.
import fontkit from "@pdf-lib/fontkit";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, rgb } from "pdf-lib";

const root = fileURLToPath(new URL("..", import.meta.url));
const LOCALES = ["en", "fr", "es", "it", "de", "el", "pl", "ro", "uk", "pt"];
const fontDir = [process.env.CARE_CARD_FONTS, "/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/dejavu", "/Library/Fonts"].find(
  (dir) => dir && existsSync(join(dir, "DejaVuSans.ttf")),
);
if (!fontDir) {
  console.error("DejaVu fonts not found: install fonts-dejavu or set CARE_CARD_FONTS to the folder with DejaVuSans.ttf.");
  process.exit(1);
}
const store = readFileSync(join(root, "src/config/store.ts"), "utf8");
const email = store.match(/export const CONTACT_EMAIL = "([^"]*)"/)?.[1] ?? "";

// A6 portrait, in points.
const W = 298;
const H = 420;
const M = 24;
const walnut = rgb(0.29, 0.196, 0.133);
const olive = rgb(0.165, 0.208, 0.098);
const muted = rgb(0.373, 0.298, 0.231);

function wrap(text, font, size, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Lays the card out at `scale`; returns the finished PDF bytes, or null when the text does not fit. */
async function build(locale, t, scale) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const sans = await pdf.embedFont(readFileSync(join(fontDir, "DejaVuSans.ttf")), { subset: true });
  const bold = await pdf.embedFont(readFileSync(join(fontDir, "DejaVuSans-Bold.ttf")), { subset: true });
  const serif = await pdf.embedFont(readFileSync(join(fontDir, "DejaVuSerif.ttf")), { subset: true });
  // Fixed dates keep the files identical between runs (no needless diffs).
  const fixed = new Date("2026-10-25T00:00:00Z");
  pdf.setTitle(t.cardTitle);
  pdf.setAuthor("Gethsemane");
  pdf.setLanguage(locale);
  pdf.setCreator("Gethsemane");
  pdf.setProducer("Gethsemane");
  pdf.setCreationDate(fixed);
  pdf.setModificationDate(fixed);

  const page = pdf.addPage([W, H]);
  page.drawRectangle({ x: 0, y: H - 46, width: W, height: 46, color: olive });
  page.drawText("GETHSEMANE", { x: M, y: H - 30, size: 15, font: serif, color: rgb(0.965, 0.937, 0.875) });
  let y = H - 70;
  const block = (text, { font = sans, size = 8.6, color = walnut, gap = 3, indent = 0 } = {}) => {
    const s = size * scale;
    for (const line of wrap(text, font, s, W - 2 * M - indent)) {
      page.drawText(line, { x: M + indent, y, size: s, font, color });
      y -= s * 1.3;
    }
    y -= gap * scale;
  };
  block(t.title, { font: serif, size: 14, color: olive, gap: 4 });
  block(t.intro, { gap: 6 });
  for (const key of ["daily", "oil", "kitchen"]) {
    block(t[`${key}Title`], { font: bold, size: 9, gap: 1 });
    block(t[key], { gap: 5 });
  }
  block(t.avoidTitle, { font: bold, size: 9, gap: 1 });
  for (const n of [1, 2, 3]) block(`•  ${t[`avoid${n}`]}`, { gap: 1, indent: 4 });
  y -= 4 * scale;
  block(t.variation, { color: muted, gap: 0 });
  if (y < M + 14) return null;
  if (email) page.drawText(email, { x: M, y: M, size: 8, font: sans, color: muted });
  return pdf.save({ useObjectStreams: false });
}

for (const locale of LOCALES) {
  const t = JSON.parse(readFileSync(join(root, "messages", `${locale}.json`), "utf8")).care;
  let bytes = null;
  // The longest languages get slightly smaller text; below 75 % the card would be hard to read.
  for (let scale = 1; !bytes && scale >= 0.75; scale -= 0.05) bytes = await build(locale, t, scale);
  if (!bytes) throw new Error(`${locale}: the care text no longer fits on the card (shorten it or enlarge the card)`);
  writeFileSync(join(root, "public/care-card", `gethsemane-care-${locale}.pdf`), bytes);
  console.log(`public/care-card/gethsemane-care-${locale}.pdf (${Math.round(bytes.length / 1024)} KB)`);
}

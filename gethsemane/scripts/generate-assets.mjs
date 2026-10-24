// Generates the images the site uses as local files. Brand images come from the approved files in
// ../brand/ (gethsemane-logo.png, gethsemane-icon.png, gethsemane-logo.svg); other colors come from
// the design tokens in src/app/globals.css.
//   - public/brand/: full emblem PNG and the compact mark SVG (arch scene + cross, no rings, no text)
//   - favicons (16/32/48 PNG + .ico, Apple touch 180, manifest 192/512) and the Open Graph / Twitter image
//   - category banners
//   - neutral placeholder photos for products whose image file does not exist yet
//
//   npm run assets                         keep existing product photos, create missing placeholders
//   npm run assets -- --force-placeholders  overwrite every product image with a placeholder
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildMarkSvg } from "./brand-mark.mjs";
import { products } from "../src/data/products.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = (p) => {
  const full = join(root, p);
  mkdirSync(dirname(full), { recursive: true });
  return full;
};
const forcePlaceholders = process.argv.includes("--force-placeholders");

// Design tokens (single source of truth: src/app/globals.css).
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");
const T = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
const C = {
  cream: T.cream,
  linen: T.linen,
  line: T.line,
  ink: T.ink,
  inkMuted: T["ink-muted"],
  olive950: T["olive-950"],
  olive900: T["olive-900"],
  olive700: T["olive-700"],
  olive600: T["olive-600"],
  leafLight: T["leaf-light"],
  walnut300: T["walnut-300"],
  gold: T["gold-500"],
  gold300: T["gold-300"],
  goldText: T["gold-text"],
  onDark: T["on-dark"],
};
for (const [k, v] of Object.entries(C)) if (!v) throw new Error(`Missing design token for ${k}`);

// ---------- Brand files ----------
const brandDir = join(root, "..", "brand");
const brandLogo = join(brandDir, "gethsemane-logo.png");
const brandIcon = join(brandDir, "gethsemane-icon.png");
for (const f of [brandLogo, brandIcon, join(brandDir, "gethsemane-logo.svg")]) {
  if (!existsSync(f)) throw new Error(`Missing brand file ${f}`);
}
copyFileSync(brandLogo, out("public/brand/gethsemane-logo.png"));
const markSvg = buildMarkSvg(join(brandDir, "gethsemane-logo.svg"));
writeFileSync(out("public/brand/gethsemane-mark.svg"), markSvg);
// The mark as a transparent PNG, used as a watermark inside generated placeholder images.
const markPng = await sharp(Buffer.from(markSvg), { density: 144 }).resize({ height: 640 }).png().toBuffer();
const markDataUri = `data:image/png;base64,${markPng.toString("base64")}`;
const MARK_RATIO = 536 / 648;
/** The mark scaled to `height`, horizontally centred on `cx`, top at `y`. */
const mark = (cx, y, height, opacity = 1) =>
  `<image href="${markDataUri}" x="${cx - (height * MARK_RATIO) / 2}" y="${y}" width="${height * MARK_RATIO}" height="${height}" opacity="${opacity}"/>`;

const escapeXml = (s) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);

async function writeWebp(svg, path, width, height, quality = 80) {
  await sharp(Buffer.from(svg), { density: 96 }).resize(width, height).webp({ quality, effort: 6 }).toFile(out(path));
}

// ---------- Product placeholders (4:5) ----------
/** Splits a name into at most 3 lines of about `max` characters. */
function wrap(text, max = 18) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function placeholderSvg(name) {
  const lines = wrap(name.toUpperCase());
  const text = lines
    .map((l, i) => `<text x="400" y="${690 + i * 58}" text-anchor="middle" font-family="DejaVu Serif, serif" font-size="44" letter-spacing="5" fill="${C.ink}">${escapeXml(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    <rect width="800" height="1000" fill="${C.cream}"/>
    <rect x="40" y="40" width="720" height="920" rx="28" fill="${C.linen}" opacity="0.55" stroke="${C.line}" stroke-width="2"/>
    ${mark(400, 170, 420, 0.3)}
    ${text}
    <text x="400" y="${690 + lines.length * 58 + 40}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="22" letter-spacing="6" fill="${C.inkMuted}">PHOTO COMING SOON</text>
  </svg>`;
}

// SHA-256 of every placeholder ever generated, so `npm run check:launch` can tell a placeholder from a photo.
const hashFile = join(root, "scripts/placeholder-hashes.json");
const placeholderHashes = new Set(existsSync(hashFile) ? JSON.parse(readFileSync(hashFile, "utf8")) : []);
let created = 0;
for (const product of products) {
  if (!product.image.startsWith("/")) throw new Error(`${product.slug}: image must start with "/"`);
  const path = join("public", product.image);
  if (!forcePlaceholders && existsSync(join(root, path))) continue;
  if (!/\.webp$/.test(path)) throw new Error(`${product.slug}: placeholders are generated as .webp; use a .webp path or add your photo`);
  await writeWebp(placeholderSvg(product.text.en.name), path, 800, 1000);
  placeholderHashes.add(createHash("sha256").update(readFileSync(join(root, path))).digest("hex"));
  created++;
}
writeFileSync(hashFile, JSON.stringify([...placeholderHashes].sort(), null, 2) + "\n");

// ---------- Category banners (4:3): neutral cards with the mark ----------
const categories = ["nativity", "crosses", "rosaries", "home"];
for (const [i, cat] of categories.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${i % 2 ? C.linen : C.cream}"/>
    <rect x="30" y="30" width="740" height="540" rx="22" fill="none" stroke="${C.line}" stroke-width="2"/>
    ${mark(400, 120, 360, 0.35)}</svg>`;
  await writeWebp(svg, `public/images/categories/${cat}.webp`, 800, 600);
}

// ---------- Open Graph / Twitter image: the full emblem centred on cream, not cropped ----------
const og = await sharp({ create: { width: 1200, height: 630, channels: 3, background: C.cream } })
  .composite([{ input: await sharp(brandLogo).resize(600, 600).png().toBuffer(), left: 300, top: 15 }])
  .png({ compressionLevel: 9 })
  .toBuffer();
writeFileSync(out("public/brand/og-image.png"), og);

// ---------- Favicons ----------
// The full icon has wide margins and rings, so it is unreadable at 16–48 px: small sizes use a tight
// crop of the arch, tree and cross. Larger icons (Apple touch, manifest) use the full icon.
const smallSource = await sharp(brandIcon).extract({ left: 187, top: 186, width: 650, height: 650 }).png().toBuffer();
const small = {};
for (const size of [16, 32, 48]) {
  small[size] = await sharp(smallSource).resize(size, size, { kernel: "lanczos3" }).sharpen().ensureAlpha().png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(out(`public/icons/favicon-${size}.png`), small[size]);
}
for (const [size, name] of [[180, "apple-touch-icon.png"], [192, "icon-192.png"], [512, "icon-512.png"]]) {
  await sharp(brandIcon).resize(size, size).png({ compressionLevel: 9 }).toFile(out(`public/icons/${name}`));
}
// favicon.ico with 16, 32 and 48 px PNG entries.
const entries = [16, 32, 48];
const icoHeader = Buffer.alloc(6 + 16 * entries.length);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(entries.length, 4);
let offset = icoHeader.length;
entries.forEach((size, i) => {
  const at = 6 + i * 16;
  icoHeader.writeUInt8(size, at);
  icoHeader.writeUInt8(size, at + 1);
  icoHeader.writeUInt16LE(1, at + 4);
  icoHeader.writeUInt16LE(32, at + 6);
  icoHeader.writeUInt32LE(small[size].length, at + 8);
  icoHeader.writeUInt32LE(offset, at + 12);
  offset += small[size].length;
});
writeFileSync(out("src/app/favicon.ico"), Buffer.concat([icoHeader, ...entries.map((s) => small[s])]));

console.log(`Created ${created} product placeholder(s); regenerated brand files, favicons, Open Graph and category images.`);

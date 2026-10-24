// Generates the images the site uses as local files. Brand images come from the approved files in
// ../brand/ (gethsemane-logo.png, gethsemane-icon.png, gethsemane-logo.svg); other colors come from
// the design tokens in src/app/globals.css.
//   - public/brand/: full emblem PNG and the compact mark SVG (arch scene + cross, no rings, no text)
//   - favicons (16/32/48 PNG + .ico, Apple touch 180, manifest 192/512) and the Open Graph / Twitter image
//   - category banners and the home story illustration
//   - neutral placeholder photos for products whose image file does not exist yet
//
//   npm run assets                         keep existing product photos, create missing placeholders
//   npm run assets -- --force-placeholders  overwrite every product image with a placeholder
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

// Deterministic value noise for the olive-wood grain texture.
function makeNoise(seed) {
  const perm = new Uint8Array(512);
  let x = seed * 9301 + 49297;
  const rand = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = Float32Array.from({ length: 256 }, () => rand());
  const fade = (t) => t * t * (3 - 2 * t);
  return (fx, fy) => {
    const xi = Math.floor(fx), yi = Math.floor(fy);
    const tx = fade(fx - xi), ty = fade(fy - yi);
    const v = (a, b) => grad[perm[(perm[a & 255] + b) & 255]];
    const top = v(xi, yi) * (1 - tx) + v(xi + 1, yi) * tx;
    const bottom = v(xi, yi + 1) * (1 - tx) + v(xi + 1, yi + 1) * tx;
    return top * (1 - ty) + bottom * ty;
  };
}

/** Olive-wood grain as a base64 PNG data URI (grain runs along the x axis unless rotated). */
async function woodTexture(w, h, seed, vertical = false) {
  const noise = makeNoise(seed);
  const dark = [104, 64, 33];
  const light = [214, 168, 112];
  const buf = Buffer.alloc(w * h * 3);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const [u, v] = vertical ? [py, px] : [px, py];
      const warp = noise(u * 0.003, v * 0.01) * 5 + noise(u * 0.02, v * 0.05) * 1.2;
      const ring = 0.5 + 0.5 * Math.sin(v * 0.07 + warp * 2.2);
      const fine = noise(u * 0.3, v * 1.2) * 0.12;
      const t = Math.min(1, Math.max(0, ring ** 1.6 * 0.85 + fine + noise(u * 0.002, v * 0.004) * 0.25));
      const i = (py * w + px) * 3;
      for (let c = 0; c < 3; c++) buf[i + c] = Math.round(dark[c] + (light[c] - dark[c]) * t);
    }
  }
  const png = await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** Fills `shapes` (plain SVG shapes) with wood grain, plus a soft shadow and a top highlight. */
function woodLayer(id, shapes, texture, w, h) {
  return `<defs><clipPath id="clip-${id}">${shapes}</clipPath>
    <filter id="blur-${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="12"/></filter>
    <linearGradient id="shade-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.onDark}" stop-opacity="0.22"/><stop offset="0.55" stop-color="${C.onDark}" stop-opacity="0"/><stop offset="1" stop-color="${C.ink}" stop-opacity="0.28"/></linearGradient></defs>
    <g transform="translate(6 18)" fill="${C.ink}" opacity="0.32" filter="url(#blur-${id})">${shapes}</g>
    <image href="${texture}" x="0" y="0" width="${w}" height="${h}" clip-path="url(#clip-${id})" preserveAspectRatio="none"/>
    <rect x="0" y="0" width="${w}" height="${h}" fill="url(#shade-${id})" clip-path="url(#clip-${id})"/>`;
}

function backdrop(w, h, from = C.cream, to = C.linen) {
  return `<defs><radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <ellipse cx="${w / 2}" cy="${h * 0.86}" rx="${w * 0.36}" ry="${h * 0.035}" fill="${C.ink}" opacity="0.10"/>`;
}

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

let created = 0;
for (const product of products) {
  if (!product.image.startsWith("/")) throw new Error(`${product.slug}: image must start with "/"`);
  const path = join("public", product.image);
  if (!forcePlaceholders && existsSync(join(root, path))) continue;
  if (!/\.webp$/.test(path)) throw new Error(`${product.slug}: placeholders are generated as .webp; use a .webp path or add your photo`);
  await writeWebp(placeholderSvg(product.text.en.name), path, 800, 1000);
  created++;
}

// ---------- Category banners (4:3): neutral cards with the mark ----------
const categories = ["nativity", "crosses", "rosaries", "home"];
for (const [i, cat] of categories.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${i % 2 ? C.linen : C.cream}"/>
    <rect x="30" y="30" width="740" height="540" rx="22" fill="none" stroke="${C.line}" stroke-width="2"/>
    ${mark(400, 120, 360, 0.35)}</svg>`;
  await writeWebp(svg, `public/images/categories/${cat}.webp`, 800, 600);
}

// ---------- Home story section: an old olive tree ----------
const leaves = Array.from({ length: 160 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 30 + ((i * 53) % 250);
  const cx = 600 + r * Math.cos(a) * 1.5;
  const cy = 290 + r * Math.sin(a) * 0.62;
  return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="24" ry="8" transform="rotate(${(i * 47) % 180} ${cx.toFixed(0)} ${cy.toFixed(0)})" fill="${i % 3 ? C.olive600 : C.leafLight}"/>`;
}).join("");
const trunk = `<path d="M520 820 C 540 700, 500 620, 560 520 C 590 470, 540 420, 500 340 L 545 335 C 590 410, 630 450, 615 310 L 660 312 C 680 440, 650 520, 690 560 C 740 620, 690 720, 730 820 Z"/>`;
const aboutSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">${backdrop(1200, 900, C.cream, C.linen)}
  <rect y="800" width="1200" height="100" fill="${C.line}"/>
  ${woodLayer("t", trunk, await woodTexture(1200, 900, 21, true), 1200, 900)}${leaves}</svg>`;
await writeWebp(aboutSvg, "public/images/about/olive-tree.webp", 1200, 900);

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

console.log(`Created ${created} product placeholder(s); regenerated brand files, favicons, Open Graph, category and story images.`);

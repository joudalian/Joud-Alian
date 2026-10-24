// Generates the images the site uses as local files, with colors read from the design tokens
// in src/app/globals.css:
//   - favicon, Apple touch icon and Open Graph image (the Ghusn arch logo)
//   - home hero, category banners and the Our Story illustration
//   - neutral placeholder photos for products whose image file does not exist yet
//
//   npm run assets                         keep existing product photos, create missing placeholders
//   npm run assets -- --force-placeholders  overwrite every product image with a placeholder
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ARCH_VIEWBOX, TAGLINE, WORDMARK, archSvg } from "../src/assets/brand.mjs";
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

const [, , VBW] = ARCH_VIEWBOX.split(" ").map(Number);
/** The arch mark scaled to `width`, with its top-left corner at (x, y). */
const arch = (x, y, width, colors) =>
  `<g transform="translate(${x} ${y}) scale(${width / VBW})">${archSvg(colors)}</g>`;
const onLight = { leaf: C.olive600, stem: C.olive700, olive: C.gold };
const onDark = { leaf: C.leafLight, stem: C.walnut300, olive: C.gold };
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
    <g opacity="0.35">${arch(160, 250, 480, onLight)}</g>
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

// ---------- Category banners (4:3): neutral cards with the arch ----------
const categories = ["nativity", "crosses", "rosaries", "home"];
for (const [i, cat] of categories.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
    <rect width="800" height="600" fill="${i % 2 ? C.linen : C.cream}"/>
    <rect x="30" y="30" width="740" height="540" rx="22" fill="none" stroke="${C.line}" stroke-width="2"/>
    <g opacity="0.5">${arch(220, 190, 360, onLight)}</g></svg>`;
  await writeWebp(svg, `public/images/categories/${cat}.webp`, 800, 600);
}

// ---------- Home hero: a large gold arch on deep olive (the text sits on the left) ----------
const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><radialGradient id="hbg" cx="72%" cy="55%" r="70%"><stop offset="0" stop-color="${C.olive900}"/><stop offset="1" stop-color="${C.olive950}"/></radialGradient></defs>
  <rect width="1920" height="1080" fill="url(#hbg)"/>
  <g opacity="0.9">${arch(1060, 300, 720, onDark)}</g>
</svg>`;
await writeWebp(heroSvg, "public/images/hero/home.webp", 1920, 1080, 78);

// ---------- Our Story: an old olive tree ----------
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

// ---------- Open Graph image: arch, wordmark below, tagline ----------
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${C.olive950}"/>
  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="${C.gold}" stroke-opacity="0.7" stroke-width="2"/>
  ${arch(430, 110, 340, onDark)}
  <text x="600" y="430" text-anchor="middle" font-family="DejaVu Serif, serif" font-size="92" letter-spacing="26" fill="${C.onDark}">${WORDMARK}</text>
  <text x="600" y="492" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="28" letter-spacing="9" fill="${C.gold300}">${escapeXml(TAGLINE)}</text>
</svg>`;
await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(out("src/app/opengraph-image.png"));

// ---------- Favicons: the arch on a deep olive tile ----------
const iconSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${C.olive950}"/>${arch(2, 14, 60, { leaf: C.leafLight, stem: C.gold300, olive: C.gold })}</svg>`;
writeFileSync(out("src/app/icon.svg"), iconSvg(64));
await sharp(Buffer.from(iconSvg(180))).png().toFile(out("src/app/apple-icon.png"));
const ico32 = await sharp(Buffer.from(iconSvg(32))).png().toBuffer();
// ICO container holding a single 32×32 PNG.
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(ico32.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync(out("src/app/favicon.ico"), Buffer.concat([header, ico32]));

console.log(`Created ${created} product placeholder(s); regenerated category, hero, story, Open Graph and icon images.`);

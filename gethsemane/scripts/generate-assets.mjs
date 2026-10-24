// Generates every image the site uses (product illustrations, category and hero art,
// Open Graph image and favicons) as local files. Run with: npm run assets
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { branchSvg } from "../src/assets/brand.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = (p) => {
  const full = join(root, p);
  mkdirSync(dirname(full), { recursive: true });
  return full;
};

const C = {
  cream: "#F8F3E9",
  linen: "#EFE6D4",
  olive900: "#252E16",
  olive700: "#4A5A2A",
  olive500: "#6E7F3F",
  gold: "#C29A47",
  wood: "#7B5232",
};

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
    <linearGradient id="shade-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#2a1a0c" stop-opacity="0.28"/></linearGradient></defs>
    <g transform="translate(6 18)" fill="#3b2a17" opacity="0.32" filter="url(#blur-${id})">${shapes}</g>
    <image href="${texture}" x="0" y="0" width="${w}" height="${h}" clip-path="url(#clip-${id})" preserveAspectRatio="none"/>
    <rect x="0" y="0" width="${w}" height="${h}" fill="url(#shade-${id})" clip-path="url(#clip-${id})"/>`;
}

function backdrop(w, h, from = C.cream, to = C.linen) {
  return `<defs><radialGradient id="bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <ellipse cx="${w / 2}" cy="${h * 0.86}" rx="${w * 0.36}" ry="${h * 0.035}" fill="#3b2a17" opacity="0.10"/>`;
}

const beadsOnEllipse = (cx, cy, rx, ry, n, r, skip = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + ((i + skip / 2) / (n + skip)) * Math.PI * 2 + Math.PI;
    return `<circle cx="${(cx + rx * Math.cos(a)).toFixed(1)}" cy="${(cy + ry * Math.sin(a)).toFixed(1)}" r="${r}"/>`;
  }).join("");

const latinCross = (x, y, s) =>
  `<path d="M${x - 0.12 * s} ${y} h${0.24 * s} v${0.3 * s} h${0.28 * s} v${0.22 * s} h-${0.28 * s} v${0.62 * s} h-${0.24 * s} v-${0.62 * s} h-${0.28 * s} v-${0.22 * s} h${0.28 * s}z"/>`;
const greekCross = (cx, cy, s) =>
  `<path d="M${cx - s * 0.18} ${cy - s / 2} h${s * 0.36} v${s * 0.32} h${s * 0.32} v${s * 0.36} h-${s * 0.32} v${s * 0.32} h-${s * 0.36} v-${s * 0.32} h-${s * 0.32} v-${s * 0.36} h${s * 0.32}z"/>`;
const figure = (cx, base, h, w) =>
  `<path d="M${cx - w / 2} ${base} C ${cx - w / 2} ${base - h * 0.55}, ${cx - w * 0.28} ${base - h * 0.78}, ${cx} ${base - h * 0.8} C ${cx + w * 0.28} ${base - h * 0.78}, ${cx + w / 2} ${base - h * 0.55}, ${cx + w / 2} ${base} Z"/><circle cx="${cx}" cy="${base - h * 0.86}" r="${w * 0.24}"/>`;
const star = (cx, cy, r) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
  });
  return `<polygon points="${pts.join(" ")}" fill="${C.gold}"/>`;
};

const nativityShapes = `<path d="M150 470 L400 300 L650 470 L620 490 L400 345 L180 490 Z"/>
  <rect x="200" y="470" width="28" height="330"/><rect x="572" y="470" width="28" height="330"/>
  ${figure(320, 800, 270, 110)}${figure(480, 800, 300, 110)}
  <path d="M350 800 h100 l-14 -60 h-72 z"/><ellipse cx="400" cy="735" rx="44" ry="18"/>
  <rect x="150" y="800" width="500" height="26" rx="6"/>`;

/** Each artwork, on a 800×1000 canvas: `wood` shapes get the grain, `before`/`after` are drawn plainly. */
const art = {
  "nativity-set-classic": { before: star(400, 230, 34), wood: nativityShapes },
  "nativity-stable-grand": {
    before: star(400, 170, 40),
    wood: `<path d="M90 430 L400 230 L710 430 L680 455 L400 280 L120 455 Z"/>
    <rect x="130" y="440" width="30" height="380"/><rect x="640" y="440" width="30" height="380"/><rect x="385" y="300" width="30" height="120"/>
    ${figure(240, 820, 230, 95)}${figure(340, 820, 280, 105)}${figure(460, 820, 300, 105)}${figure(565, 820, 240, 95)}
    <path d="M360 820 h80 l-12 -48 h-56 z"/><rect x="100" y="820" width="600" height="30" rx="6"/>`,
  },
  "holy-family-figurine": {
    wood: `<path d="M250 820 C 240 600, 270 420, 330 360 C 360 330, 380 330, 400 340 C 420 330, 440 330, 470 360 C 530 420, 560 600, 550 820 Z"/>
    <circle cx="335" cy="315" r="48"/><circle cx="470" cy="300" r="52"/><rect x="230" y="815" width="340" height="32" rx="8"/>`,
    after: `<path d="M330 420 C 360 520, 360 640, 340 800 M470 400 C 440 520, 440 660, 460 800" stroke="#4a2f17" stroke-opacity="0.35" stroke-width="5" fill="none"/>`,
  },
  "jerusalem-cross": {
    wood: `<path d="M370 250 h60 v170 h170 v60 h-170 v170 h-60 v-170 h-170 v-60 h170z"/>
    <rect x="330" y="250" width="140" height="34" rx="4"/><rect x="330" y="616" width="140" height="34" rx="4"/>
    <rect x="200" y="380" width="34" height="140" rx="4"/><rect x="566" y="380" width="34" height="140" rx="4"/>
    ${greekCross(285, 335, 90)}${greekCross(515, 335, 90)}${greekCross(285, 565, 90)}${greekCross(515, 565, 90)}`,
  },
  "wall-cross-carved": {
    vertical: true,
    wood: latinCross(400, 170, 640),
    after: `<g fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="4">${latinCross(400, 200, 580)}</g>`,
  },
  "pocket-holding-cross": {
    vertical: true,
    wood: `<rect x="340" y="290" width="120" height="420" rx="60"/><rect x="250" y="400" width="300" height="120" rx="60"/>`,
  },
  "rosary-olive-wood": {
    wood: `${beadsOnEllipse(400, 400, 210, 220, 54, 13)}<circle cx="400" cy="640" r="20"/>
    ${[680, 712, 744, 776].map((y, i) => `<circle cx="400" cy="${y}" r="${i === 1 ? 17 : 12}"/>`).join("")}${latinCross(400, 790, 160)}`,
  },
  "chaplet-bracelet": {
    before: `<circle cx="400" cy="470" r="170" fill="none" stroke="#6b4a2e" stroke-width="3"/>`,
    wood: `${beadsOnEllipse(400, 470, 170, 170, 10, 30)}<circle cx="400" cy="660" r="22"/>${latinCross(400, 690, 120)}`,
  },
  "prayer-beads-33": {
    wood: `${beadsOnEllipse(400, 420, 190, 230, 33, 17)}<circle cx="400" cy="672" r="24"/><path d="M380 700 h40 l26 140 h-92z"/>`,
  },
  "salad-bowl": {
    wood: `<path d="M140 470 C 160 720, 290 780, 400 780 C 510 780, 640 720, 660 470 Z"/><ellipse cx="400" cy="470" rx="262" ry="62"/><rect x="330" y="770" width="140" height="40" rx="10"/>`,
    after: `<ellipse cx="400" cy="474" rx="226" ry="44" fill="#4a2f17" opacity="0.45"/>`,
  },
  "serving-board": {
    wood: `<path transform="rotate(-28 400 500)" fill-rule="evenodd" clip-rule="evenodd" d="M220 380 h360 a40 40 0 0 1 40 40 v20 h120 a30 30 0 0 1 0 120 h-120 v20 a40 40 0 0 1 -40 40 h-360 a40 40 0 0 1 -40 -40 v-160 a40 40 0 0 1 40 -40z M690 485 a16 16 0 1 0 0.1 0z"/>`,
  },
  "candle-holder-pair": {
    before: `<rect x="268" y="330" width="44" height="200" fill="#F4ECDC" stroke="#d9cbb0"/><rect x="488" y="300" width="44" height="230" fill="#F4ECDC" stroke="#d9cbb0"/>
    <path d="M290 290 c 14 18, 14 34, 0 40 c -14 -6, -14 -22, 0 -40z M510 258 c 14 18, 14 34, 0 40 c -14 -6, -14 -22, 0 -40z" fill="${C.gold}"/>`,
    vertical: true,
    wood: `<path d="M230 820 h120 l-10 -30 c -20 -10, -24 -60, -10 -90 c 14 -30, 14 -110, -6 -140 h20 v-30 h-80 v30 h20 c -20 30, -20 110, -6 140 c 14 30, 10 80, -10 90 z"/>
    <path d="M450 820 h120 l-10 -30 c -20 -10, -24 -70, -10 -100 c 14 -30, 14 -130, -6 -160 h20 v-30 h-80 v30 h20 c -20 30, -20 130, -6 160 c 14 30, 10 90, -10 100 z"/>`,
  },
};

async function writeWebp(svg, path, width, height, quality = 80) {
  await sharp(Buffer.from(svg), { density: 96 }).resize(width, height).webp({ quality, effort: 6 }).toFile(out(path));
}

async function renderPiece(slug, seed, id) {
  const piece = art[slug];
  const texture = await woodTexture(800, 1000, seed, piece.vertical);
  return `${piece.before ?? ""}${woodLayer(id, piece.wood, texture, 800, 1000)}${piece.after ?? ""}`;
}

const slugs = Object.keys(art);
for (const [i, slug] of slugs.entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">${backdrop(800, 1000)}${await renderPiece(slug, i * 7 + 3, "p")}</svg>`;
  await writeWebp(svg, `public/images/products/${slug}.webp`, 800, 1000);
}

// Category banners (4:3): a representative piece, cropped from the product canvas.
const categoryArt = { nativity: "nativity-set-classic", crosses: "jerusalem-cross", rosaries: "rosary-olive-wood", home: "salad-bowl" };
for (const [i, [cat, slug]] of Object.entries(categoryArt).entries()) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 175 800 600">${backdrop(800, 1000, C.linen, "#E4D6BB")}${await renderPiece(slug, 40 + i, "c")}</svg>`;
  await writeWebp(svg, `public/images/categories/${cat}.webp`, 800, 600);
}

// Hero: carved pieces and an olive branch on the right of a deep olive ground; the text sits on the left.
function oliveBranch(x, y, scale, rotate, colors) {
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">${branchSvg(colors)}</g>`;
}
const heroSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs><linearGradient id="hbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E2611"/><stop offset="1" stop-color="#3A4722"/></linearGradient></defs>
  <rect width="1920" height="1080" fill="url(#hbg)"/>
  ${oliveBranch(1180, -60, 12, 18, { leaf: "#55652F", stem: "#6B4A2E", olive: "#B48A3A" })}
  <g transform="translate(1010 160) scale(0.95)">${star(400, 230, 34)}${woodLayer("h1", nativityShapes, await woodTexture(800, 1000, 11), 800, 1000)}</g>
  <g transform="translate(1580 560) scale(0.38)">${woodLayer("h2", latinCross(400, 170, 640), await woodTexture(800, 1000, 12, true), 800, 1000)}</g>
</svg>`;
await writeWebp(heroSvg, "public/images/hero/home.webp", 1920, 1080, 78);

// About: an old olive tree.
const leaves = Array.from({ length: 160 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 30 + ((i * 53) % 250);
  const cx = 600 + r * Math.cos(a) * 1.5;
  const cy = 290 + r * Math.sin(a) * 0.62;
  return `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="24" ry="8" transform="rotate(${(i * 47) % 180} ${cx.toFixed(0)} ${cy.toFixed(0)})" fill="${i % 3 ? "#5E6F35" : "#8A9B55"}"/>`;
}).join("");
const trunk = `<path d="M520 820 C 540 700, 500 620, 560 520 C 590 470, 540 420, 500 340 L 545 335 C 590 410, 630 450, 615 310 L 660 312 C 680 440, 650 520, 690 560 C 740 620, 690 720, 730 820 Z"/>`;
const aboutSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">${backdrop(1200, 900, "#F3EBDB", "#E2D3B5")}
  <rect y="800" width="1200" height="100" fill="#CDBB96"/>
  ${woodLayer("t", trunk, await woodTexture(1200, 900, 21, true), 1200, 900)}${leaves}</svg>`;
await writeWebp(aboutSvg, "public/images/about/olive-tree.webp", 1200, 900);

// Logo lockup used for the Open Graph image (English only).
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${C.olive900}"/>
  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="${C.gold}" stroke-width="2"/>
  <g transform="translate(150 175) scale(4.4)">${branchSvg({ leaf: "#8A9B55", stem: "#B58A5A", olive: C.gold })}</g>
  <text x="440" y="318" font-family="DejaVu Serif, serif" font-size="74" letter-spacing="7" fill="${C.cream}">GETHSEMANE</text>
  <text x="444" y="380" font-family="DejaVu Sans, sans-serif" font-size="28" letter-spacing="7" fill="${C.gold}">OLIVE WOOD · HOLY LAND</text>
</svg>`;
await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(out("src/app/opengraph-image.png"));

// Favicons: the olive branch on a deep olive tile.
const iconSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${C.olive900}"/><g transform="translate(4 4) scale(0.875)">${branchSvg({ leaf: "#9AAB62", stem: "#C29A6A", olive: C.gold })}</g></svg>`;
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

console.log(`Generated ${slugs.length} product images, 4 category images, hero, about, Open Graph image and icons.`);

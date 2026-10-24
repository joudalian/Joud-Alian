// Product photo pipeline. Runs automatically before `next build` and `next dev` (prebuild / predev).
//
//   catalog/photos/<slug>/<name>.(jpg|png|webp|avif)      originals (committed; any subfolder depth)
//   catalog/fixtures/<slug>/…                              test-only photos (only with NEXT_PUBLIC_CATALOG_FIXTURES=1)
//   public/images/products/sized/<slug>/<name>-<w>.avif|.webp   generated (git-ignored), w = 400…1600
//   public/images/products/sized/<slug>/<name>-og.jpg      1200×630 social image for a product's first photo
//
// Originals are never served: only the sized copies are public. Before sizing, an original larger than 2000 px or
// carrying metadata (EXIF, including GPS location, XMP, IPTC) is rewritten in place: rotated upright, at most
// 2000 px on its long side, with all metadata removed. Every photo listed in the product data must exist and match
// its declared aspect ratio, otherwise the script fails (and so does the build).
//
// Options (for tests): --src <dir> (repeatable) --out <dir> --no-data
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const { PRODUCT_IMAGE_WIDTHS, OG_SIZE, MAX_ORIGINAL_SIZE } = await import("../src/lib/product-image-sizes.ts");
const args = process.argv.slice(2);
const opt = (name) => args.flatMap((a, i) => (a === name ? [args[i + 1]] : []));
const fixtures = process.env.NEXT_PUBLIC_CATALOG_FIXTURES === "1";
const sources = opt("--src").length
  ? opt("--src")
  : [join(root, "catalog/photos"), ...(fixtures ? [join(root, "catalog/fixtures")] : [])];
const outDir = opt("--out")[0] ?? join(root, "public/images/products/sized");
const useData = !args.includes("--no-data");
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;
const problems = [];

function list(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? list(full) : IMAGE.test(name) ? [full] : [];
  });
}

/** Rewrites an original in place when it is too large or carries metadata. Returns its final size. */
async function normalize(file) {
  const meta = await sharp(file).metadata();
  const tooLarge = Math.max(meta.width ?? 0, meta.height ?? 0) > MAX_ORIGINAL_SIZE;
  const hasMetadata = Boolean(meta.exif || meta.xmp || meta.iptc || (meta.orientation && meta.orientation !== 1));
  if (!tooLarge && !hasMetadata) return { width: meta.width, height: meta.height, rewritten: false };
  const format = meta.format === "jpeg" ? "jpeg" : meta.format;
  const buffer = await sharp(file)
    .rotate()
    .resize({ width: MAX_ORIGINAL_SIZE, height: MAX_ORIGINAL_SIZE, fit: "inside", withoutEnlargement: true })
    .toFormat(format, format === "jpeg" ? { quality: 90, mozjpeg: true } : { quality: 90 })
    .toBuffer({ resolveWithObject: true });
  writeFileSync(file, buffer.data);
  return { width: buffer.info.width, height: buffer.info.height, rewritten: true };
}

const fresh = (out, srcTime) => existsSync(out) && statSync(out).mtimeMs >= srcTime;

// Photos listed in the product data: they must exist and match the declared shape.
const declared = new Map();
const firstPhotos = new Set();
if (useData) {
  const { products } = await import("../src/data/products.ts");
  const { fixtures: fixtureProducts } = await import("../src/data/fixtures.ts");
  for (const [base, list] of [["catalog/photos", products], ...(fixtures ? [["catalog/fixtures", fixtureProducts]] : [])]) {
    for (const product of list) {
      for (const [i, image] of (product.images ?? []).entries()) {
        const full = join(root, base, image.file);
        declared.set(full, { product: product.slug, ...image });
        if (i === 0) firstPhotos.add(full);
        if (!existsSync(full)) problems.push(`${product.slug}: photo ${base}/${image.file} does not exist`);
      }
    }
  }
}

const expected = new Set();
let written = 0;
let rewritten = 0;
const files = sources.flatMap((dir) => list(dir).map((file) => ({ dir, file })));
for (const { dir, file } of files) {
  const size = await normalize(file);
  if (size.rewritten) {
    rewritten++;
    console.log(`Cleaned original ${relative(root, file)}: ${size.width}×${size.height}, metadata removed.`);
  }
  const info = declared.get(file);
  if (info && Math.abs(info.width / info.height - size.width / size.height) > 0.01) {
    problems.push(`${info.product}: ${relative(root, file)} is ${size.width}×${size.height}, but the data says ${info.width}×${info.height} (fix width/height)`);
  }
  const name = relative(dir, file).replace(IMAGE, "");
  const srcTime = statSync(file).mtimeMs;
  mkdirSync(join(outDir, dirname(name)), { recursive: true });
  for (const width of PRODUCT_IMAGE_WIDTHS) {
    for (const format of ["avif", "webp"]) {
      const out = join(outDir, `${name}-${width}.${format}`);
      expected.add(out);
      if (fresh(out, srcTime)) continue;
      const image = sharp(file).resize({ width, withoutEnlargement: true });
      await (format === "avif" ? image.avif({ quality: 55, effort: 3 }) : image.webp({ quality: 76 })).toFile(out);
      written++;
    }
  }
  if (firstPhotos.has(file) || !useData) {
    const out = join(outDir, `${name}-og.jpg`);
    expected.add(out);
    if (!fresh(out, srcTime)) {
      await sharp(file)
        .resize({ ...OG_SIZE, fit: "contain", background: "#f6efdf" })
        .flatten({ background: "#f6efdf" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(out);
      written++;
    }
  }
}

// Remove sized copies of photos that no longer exist.
for (const file of list(outDir)) {
  if (!expected.has(file) && existsSync(file)) rmSync(file);
}

if (problems.length) {
  console.error(`Product photos: ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`Product photos: ${files.length} originals (${rewritten} cleaned), ${written} sized files written to ${relative(root, outDir) || outDir}.`);

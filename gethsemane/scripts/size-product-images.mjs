// Pre-sizes every product photo for the product page's main image (its largest paint), so that image is a static
// file instead of a request to the on-demand image optimizer, whose first call in a fresh server process costs
// 100–200 ms. Runs automatically before `next build` and `next dev` (prebuild / predev in package.json).
//
// public/images/products/<name>.<ext>  →  public/images/products/sized/<name>-<width>.avif and .webp
// for every width in PRODUCT_IMAGE_WIDTHS (src/lib/product-image.ts), never enlarged beyond the source.
// Generated files are not committed (.gitignore); up-to-date files are skipped.
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("..", import.meta.url));
const { PRODUCT_IMAGE_WIDTHS } = await import("../src/lib/product-image.ts");
const srcDir = join(root, "public/images/products");
const outDir = join(srcDir, "sized");
mkdirSync(outDir, { recursive: true });

const sources = readdirSync(srcDir).filter((f) => /\.(webp|jpe?g|png|avif)$/i.test(f));
let written = 0;
for (const file of sources) {
  const src = join(srcDir, file);
  const srcTime = statSync(src).mtimeMs;
  const { name } = parse(file);
  for (const width of PRODUCT_IMAGE_WIDTHS) {
    for (const format of ["avif", "webp"]) {
      const out = join(outDir, `${name}-${width}.${format}`);
      try {
        if (statSync(out).mtimeMs >= srcTime) continue;
      } catch {
        // missing: generate it
      }
      const image = sharp(src).resize({ width, withoutEnlargement: true });
      await (format === "avif" ? image.avif({ quality: 55, effort: 3 }) : image.webp({ quality: 75 })).toFile(out);
      written++;
    }
  }
}
console.log(`Product images: ${sources.length} photos, ${written} sized files written to public/images/products/sized/.`);

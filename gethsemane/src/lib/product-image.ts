import { PRODUCT_IMAGE_WIDTHS } from "./product-image-sizes";

export { OG_SIZE, PRODUCT_IMAGE_WIDTHS } from "./product-image-sizes";

/** Layout widths of the main photo on the product page (see .product-detail in globals.css). */
export const PRODUCT_IMAGE_SIZES = "(min-width: 1280px) 576px, (min-width: 768px) 48vw, 100vw";
/** Layout widths of a product card photo. */
export const CARD_IMAGE_SIZES = "(min-width: 1280px) 280px, (min-width: 768px) 30vw, (min-width: 360px) 50vw, 100vw";

/** "salad-bowl/01.jpg" → "/images/products/sized/salad-bowl/01" (scripts/size-product-images.mjs). */
function sizedBase(file: string) {
  return `/images/products/sized/${file.replace(/\.[a-z]+$/i, "")}`;
}

/** srcset of the pre-sized copies of a photo, e.g. "/images/products/sized/salad-bowl/01-640.avif 640w, …". */
export function productImageSrcSet(file: string, format: "avif" | "webp") {
  return PRODUCT_IMAGE_WIDTHS.map((w) => `${sizedBase(file)}-${w}.${format} ${w}w`).join(", ");
}

/** A mid-size copy (640 px wide by default), the plain `src` fallback. */
export function productImageSrc(file: string, width: (typeof PRODUCT_IMAGE_WIDTHS)[number] = PRODUCT_IMAGE_WIDTHS[1]) {
  return `${sizedBase(file)}-${width}.webp`;
}

/** 1200×630 social sharing image of a product's first photo. */
export function productOgImage(file: string) {
  return `${sizedBase(file)}-og.jpg`;
}

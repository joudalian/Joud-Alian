/** Widths pre-generated for the product page's main photo by scripts/size-product-images.mjs (capped at 1600). */
export const PRODUCT_IMAGE_WIDTHS = [400, 640, 828, 1080, 1600] as const;

/** Layout widths of the main photo (see .product-detail in globals.css). */
export const PRODUCT_IMAGE_SIZES = "(min-width: 1280px) 576px, (min-width: 768px) 48vw, 100vw";

/** srcset of the pre-sized copies of a product photo, e.g. "/images/products/sized/salad-bowl-640.avif 640w, …". */
export function productImageSrcSet(image: string, format: "avif" | "webp") {
  const base = image.replace(/^\/images\/products\//, "/images/products/sized/").replace(/\.[a-z]+$/i, "");
  return PRODUCT_IMAGE_WIDTHS.map((w) => `${base}-${w}.${format} ${w}w`).join(", ");
}

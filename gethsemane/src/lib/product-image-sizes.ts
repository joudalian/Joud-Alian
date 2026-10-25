// No imports: scripts/size-product-images.mjs reads these too.

/** Widths generated for every product photo (AVIF and WebP), capped at 1600. */
export const PRODUCT_IMAGE_WIDTHS = [400, 640, 828, 1080, 1600] as const;

/** Originals in catalog/photos/ are reduced to at most this many pixels on their long side. */
export const MAX_ORIGINAL_SIZE = 2000;

/** Open Graph / social image of a product (its first photo on a cream background). */
export const OG_SIZE = { width: 1200, height: 630 } as const;

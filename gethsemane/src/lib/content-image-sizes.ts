// No imports: scripts/size-product-images.mjs reads these too.

/**
 * Atmosphere images: illustrative, AI-generated pictures for the hero and a few page sections. They are never
 * product photos and are never used for products, Product JSON-LD or Open Graph product data.
 * Originals live in content-images/<name>.jpg (not served); sized copies go to public/images/content/sized/.
 */
export const CONTENT_IMAGE_WIDTHS = [640, 960, 1280, 1600, 2000] as const;

/** Area of the original to keep, as fractions of its width and height (the rest is cropped away). */
type Crop = { left: number; top: number; width: number; height: number };

/** AVIF quality (default 50). */
export const CONTENT_AVIF_QUALITY = 50;

export const CONTENT_IMAGES = {
  // The largest paint on the home page, under a dark gradient: lighter files load (and decode) sooner. The 640 and
  // 960 px copies (phones) are compressed harder: there the picture sits mostly behind the darkest part of the gradient.
  "hero-olive-grove": { avifQuality: 40, phoneAvifQuality: 22 },
  // The window with the town view (top left) is cropped out.
  "craft-workshop": { crop: { left: 0.22, top: 0, width: 0.78, height: 1 } },
  "cross-olive-branch": {},
  "name-olive-press": {},
} as const satisfies Record<string, { crop?: Crop; avifQuality?: number; phoneAvifQuality?: number }>;

export type ContentImageName = keyof typeof CONTENT_IMAGES;

import type { ProductImage } from "@/data/catalog-schema";
import { productImageSrc, productImageSrcSet } from "@/lib/product-image";

/** The part of a catalog photo a picture needs (alt texts are passed separately, in one language). */
export type PictureImage = Pick<ProductImage, "file" | "width" | "height">;

/**
 * A product photo from the pre-sized AVIF/WebP copies (never the original). Works in server and client
 * components. `priority` loads it first (the largest paint); everything else is lazy.
 */
export function ProductPicture({
  image,
  alt,
  sizes,
  priority = false,
  eager = false,
  className,
}: {
  image: PictureImage;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Load without waiting for the photo to scroll into view (e.g. small thumbnails inside a scroller). */
  eager?: boolean;
  className?: string;
}) {
  return (
    <picture>
      <source type="image/avif" srcSet={productImageSrcSet(image.file, "avif")} sizes={sizes} />
      <img
        src={productImageSrc(image.file)}
        srcSet={productImageSrcSet(image.file, "webp")}
        sizes={sizes}
        alt={alt}
        width={image.width}
        height={image.height}
        loading={priority || eager ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={className}
      />
    </picture>
  );
}

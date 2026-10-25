import { preload } from "react-dom";
import manifest from "@/data/content-images.json";
import { CONTENT_IMAGE_WIDTHS, type ContentImageName } from "@/lib/content-image-sizes";

const srcSet = (name: ContentImageName, format: "avif" | "webp") =>
  CONTENT_IMAGE_WIDTHS.map((w) => `/images/content/sized/${name}-${w}.${format} ${w}w`).join(", ");

/**
 * An atmosphere image (illustrative, AI-generated; see src/lib/content-image-sizes.ts) from its pre-sized
 * AVIF/WebP copies. Lazy by default, with its width and height set and a tiny blurred placeholder behind it.
 * `priority` is only for the image that is the page's largest paint (the home hero): it is preloaded and
 * fetched with high priority.
 */
export function ContentImage({
  name,
  alt,
  sizes,
  priority = false,
  className,
}: {
  name: ContentImageName;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const { width, height, placeholder } = manifest[name];
  const avif = srcSet(name, "avif");
  if (priority) preload(`/images/content/sized/${name}-${CONTENT_IMAGE_WIDTHS[0]}.avif`, { as: "image", type: "image/avif", imageSrcSet: avif, imageSizes: sizes, fetchPriority: "high" });
  return (
    <picture>
      <source type="image/avif" srcSet={avif} sizes={sizes} />
      <img
        src={`/images/content/sized/${name}-${CONTENT_IMAGE_WIDTHS[1]}.webp`}
        srcSet={srcSet(name, "webp")}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        // Always async: the first frame (text, gradient) must not wait for the picture to be decoded.
        decoding="async"
        className={className}
        data-content-image={name}
        // The blurred placeholder fills the box until a lazy picture arrives (the hero arrives first anyway).
        style={priority ? undefined : { backgroundImage: `url(${placeholder})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
    </picture>
  );
}

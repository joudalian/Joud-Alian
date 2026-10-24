import { getImageProps } from "next/image";
import { preload } from "react-dom";

// On phones the hero sits under an almost opaque scrim, so it is not downloaded there (a 1×1 transparent
// GIF is used instead) and the heading becomes the largest paint. Wider screens get the preloaded image.
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const DESKTOP = "(min-width: 768px)";

export function HeroImage({ src, alt }: { src: string; alt: string }) {
  const { props } = getImageProps({ src, alt, fill: true, sizes: "100vw", quality: 75, fetchPriority: "high" });
  preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: "high", media: DESKTOP });
  return (
    <picture>
      <source media="(max-width: 767.98px)" srcSet={TRANSPARENT_PIXEL} />
      <img {...props} alt={alt} className="hero-image" />
    </picture>
  );
}

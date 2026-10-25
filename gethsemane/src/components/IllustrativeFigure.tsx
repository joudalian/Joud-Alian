import { getTranslations } from "next-intl/server";
import type { ContentImageName } from "@/lib/content-image-sizes";
import { ContentImage } from "./ContentImage";

/** Half of the 1200 px container (minus gutters and gap) on wide screens, the container width on phones. */
export const STORY_IMAGE_SIZES = "(min-width: 1200px) 552px, (min-width: 768px) calc(50vw - 48px), calc(100vw - 32px)";

/**
 * An atmosphere image shown as content (not as a background), with a small "Illustrative image" caption: these
 * pictures are AI-generated and show no real workshop, tree or product of ours.
 */
export async function IllustrativeFigure({
  name,
  alt,
  sizes,
  className,
}: {
  name: ContentImageName;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const t = await getTranslations("imagery");
  return (
    <figure className={`illustrative-figure ${className ?? ""}`.trim()} data-testid={`figure-${name}`}>
      <ContentImage name={name} alt={alt} sizes={sizes} />
      <figcaption className="illustrative-note">{t("illustrative")}</figcaption>
    </figure>
  );
}

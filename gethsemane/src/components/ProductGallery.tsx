"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { PRODUCT_IMAGE_SIZES } from "@/lib/product-image";
import { ProductPicture, type PictureImage } from "./ProductPicture";

/**
 * Product photos: a horizontal, scroll-snapping strip (swipe on phones), with previous/next buttons and
 * thumbnails. When the strip has focus, the arrow keys, Home and End move between photos. The first photo is
 * the page's largest paint and loads first; the others load lazily.
 */
export function ProductGallery({ images, name }: { images: { image: PictureImage; alt: string }[]; name: string }) {
  const t = useTranslations("product");
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const count = images.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track || count < 2) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      setCurrent(Math.min(count - 1, Math.max(0, Math.round(track.scrollLeft / track.clientWidth))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("scroll", onScroll);
    };
  }, [count]);

  const go = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = (index + count) % count;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: next * track.clientWidth, behavior: reduce ? "auto" : "smooth" });
    setCurrent(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: count - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    go(keys[e.key]!);
  };

  if (count === 1) {
    return (
      <div className="gallery">
        <ProductPicture image={images[0]!.image} alt={images[0]!.alt} sizes={PRODUCT_IMAGE_SIZES} priority className="gallery-image" />
      </div>
    );
  }

  return (
    <div className="gallery" data-testid="gallery">
      <div
        ref={trackRef}
        className="gallery-track"
        role="region"
        aria-roledescription={t("gallery")}
        aria-label={t("galleryLabel", { name, count })}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {images.map(({ image, alt }, i) => (
          <figure
            key={image.file}
            className="gallery-slide"
            role="group"
            aria-roledescription={t("gallerySlide")}
            aria-label={t("photoNumber", { n: i + 1, count })}
            aria-hidden={i === current ? undefined : true}
          >
            <ProductPicture image={image} alt={alt} sizes={PRODUCT_IMAGE_SIZES} priority={i === 0} className="gallery-image" />
          </figure>
        ))}
      </div>
      <div className="gallery-controls">
        <button type="button" className="icon-btn gallery-prev" onClick={() => go(current - 1)} aria-label={t("previousPhoto")}>
          <span aria-hidden="true">‹</span>
        </button>
        <ol className="gallery-thumbs">
          {images.map(({ image }, i) => (
            <li key={image.file}>
              <button
                type="button"
                className="gallery-thumb"
                aria-label={t("photoNumber", { n: i + 1, count })}
                aria-current={i === current ? "true" : undefined}
                onClick={() => go(i)}
              >
                <ProductPicture image={image} alt="" sizes="64px" eager />
              </button>
            </li>
          ))}
        </ol>
        <button type="button" className="icon-btn gallery-next" onClick={() => go(current + 1)} aria-label={t("nextPhoto")}>
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {t("photoNumber", { n: current + 1, count })}
      </p>
    </div>
  );
}

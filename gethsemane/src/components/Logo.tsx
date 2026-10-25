import Image from "next/image";

export const MARK_SRC = "/brand/gethsemane-mark.svg";
export const WORDMARK = "GETHSEMANE";
export const TAGLINE = "OLIVE WOOD · HOLY LAND";

/**
 * The compact mark (arch, olive tree, olive press and cross), served as a static SVG file so the page
 * never inlines it (its clipPath id must stay unique) and the CSP needs no change.
 * Decorative next to the wordmark: the link's accessible name is the visible text.
 */
function Mark({ height, eager = false }: { height: number; eager?: boolean }) {
  const width = Math.round((height * 536) / 648);
  return (
    <Image
      src={MARK_SRC}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      unoptimized
      // The header mark is above the fold (and preloaded on the home page): never lazy there.
      loading={eager ? "eager" : "lazy"}
      className="logo-mark"
    />
  );
}

/** Header lockup: mark + live-text wordmark (English in every language). */
export function HeaderLogo() {
  return (
    <span className="logo-lockup" lang="en">
      <Mark height={56} eager />
      <span className="logo-name">{WORDMARK}</span>
    </span>
  );
}

/** Footer lockup: mark + wordmark + tagline. */
export function FooterLogo() {
  return (
    <span className="logo-lockup logo-lockup-footer" lang="en">
      <Mark height={64} />
      <span className="logo-text">
        <span className="logo-name">{WORDMARK}</span>
        <span className="logo-tagline">{TAGLINE}</span>
      </span>
    </span>
  );
}

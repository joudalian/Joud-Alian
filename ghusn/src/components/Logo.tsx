import { ARCH_VIEWBOX, TAGLINE, WORDMARK, archLeaves, archOlives, archStem } from "@/assets/brand.mjs";

/** The olive-branch arch. Decorative: the accessible name comes from the visible wordmark. Colors: globals.css. */
export function LogoMark({ width = 48, className = "logo-mark" }: { width?: number; className?: string }) {
  return (
    <svg className={className} width={width} height={(width * 72) / 120} viewBox={ARCH_VIEWBOX} aria-hidden="true" focusable="false">
      <path className="logo-stem" d={archStem} fill="none" strokeWidth={2.4} strokeLinecap="round" />
      {archLeaves.map(([x, y, rot, rx, ry]) => (
        <ellipse key={`${x}-${y}`} className="logo-leaf" cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${rot} ${x} ${y})`} />
      ))}
      {archOlives.map(([x, y, r]) => (
        <circle key={`${x}-${y}`} className="logo-olive" cx={x} cy={y} r={r} />
      ))}
    </svg>
  );
}

/** English-only lockup in every language: arch icon, wordmark "GHUSN" below, tagline. */
export function LogoLockup() {
  return (
    <span className="logo-lockup" lang="en">
      <LogoMark />
      <span className="logo-name">{WORDMARK}</span>
      <span className="logo-tagline">{TAGLINE}</span>
    </span>
  );
}

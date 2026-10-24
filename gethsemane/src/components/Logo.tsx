import { branchLeaves, branchOlives, branchStem } from "@/assets/brand.mjs";

/** The olive-branch mark. Decorative: the accessible name comes from the surrounding link. */
export function LogoMark({ size = 36, dark = false }: { size?: number; dark?: boolean }) {
  const leaf = dark ? "#9AAB62" : "#4A5A2A";
  const stem = dark ? "#C29A6A" : "#7B5232";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d={branchStem} fill="none" stroke={stem} strokeWidth={2.4} strokeLinecap="round" />
      {branchLeaves.map(([cx, cy, r]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={8.5} ry={2.9} transform={`rotate(${r} ${cx} ${cy})`} fill={leaf} />
      ))}
      {branchOlives.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#C29A47" />
      ))}
    </svg>
  );
}

/** English-only lockup: mark + "GETHSEMANE" + "OLIVE WOOD · HOLY LAND". */
export function LogoLockup({ dark = false }: { dark?: boolean }) {
  return (
    <>
      <LogoMark dark={dark} />
      <span className="logo-text" lang="en">
        <span className="logo-name">GETHSEMANE</span>
        <span className="logo-tagline">OLIVE WOOD · HOLY LAND</span>
      </span>
    </>
  );
}
